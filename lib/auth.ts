import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kcda_up_session";
export const OAUTH_STATE_COOKIE = "kcda_up_oauth_state";

export type SessionPayload = {
  username: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: number;
  exp: number;
};

function key() {
  return createHash("sha256")
    .update(process.env.APP_SECRET || "kcda-up-development-secret")
    .digest();
}

export function createSession(
  payload: Omit<SessionPayload, "exp"> & { exp?: number },
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: payload.exp || Date.now() + 8 * 60 * 60 * 1000,
    }),
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return [
    "v2",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function verifySession(token?: string): SessionPayload | null {
  if (!token) return null;
  const [version, iv, tag, ciphertext] = token.split(".");
  if (version !== "v2" || !iv || !tag || !ciphertext) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const value = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const session = JSON.parse(value) as SessionPayload;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export function allowedGoogleEmails() {
  return new Set(
    String(process.env.GOOGLE_ALLOWED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function sessionGoogleAccessToken(session: SessionPayload) {
  if (session.tokenExpiresAt > Date.now() + 60_000) return session.accessToken;
  if (!session.refreshToken)
    throw new Error("Sesi Google kedaluwarsa. Silakan masuk kembali.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      refresh_token: session.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !result.access_token)
    throw new Error(
      result.error_description || "Gagal memperbarui akses Google",
    );
  return result.access_token;
}
