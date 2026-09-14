import { NextResponse } from "next/server";
import { createSession, expectedCredentials, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const expected = expectedCredentials();
  if (String(body?.username || "").trim() !== expected.username || String(body?.password || "") !== expected.password) return NextResponse.json({ ok: false, error: "Username atau password salah" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSession(expected.username), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 28800 });
  return response;
}
