import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kcda_up_session";

type SessionPayload = { username: string; exp: number };

function secret() {
  return process.env.APP_SECRET || "kcda-up-development-secret";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function sign(value: string) {
  return base64Url(createHmac("sha256", secret()).update(value).digest());
}

export function expectedCredentials() {
  return { username: process.env.APP_USERNAME || "IPDSBPS1804", password: process.env.APP_PASSWORD || "buatkcdaazmi" };
}

export function createSession(username: string) {
  const payload = base64Url(JSON.stringify({ username, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as SessionPayload;
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
