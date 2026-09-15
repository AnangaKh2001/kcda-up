import { NextResponse } from "next/server";
import {
  allowedGoogleEmails,
  createSession,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth";

function cookieValue(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  if (!state || state !== cookieValue(request, OAUTH_STATE_COOKIE))
    return NextResponse.redirect(
      new URL("/login?error=oauth_state", request.url),
    );
  const code = url.searchParams.get("code");
  if (!code)
    return NextResponse.redirect(
      new URL("/login?error=oauth_denied", request.url),
    );
  try {
    const redirectUri =
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      new URL("/api/auth/google/callback", request.url).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!tokenResponse.ok || !tokens.access_token)
      throw new Error(
        tokens.error_description || "Pertukaran token Google gagal",
      );
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { authorization: `Bearer ${tokens.access_token}` } },
    );
    const profile = (await profileResponse.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    const email = String(profile.email || "").toLowerCase();
    if (!profileResponse.ok || !profile.email_verified || !email)
      throw new Error("Email Google tidak dapat diverifikasi");
    if (!allowedGoogleEmails().has(email))
      return NextResponse.redirect(
        new URL("/login?error=email_denied", request.url),
      );
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(
      SESSION_COOKIE,
      createSession({
        username: profile.name || email,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 28_800,
      },
    );
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }
}
