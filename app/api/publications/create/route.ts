import { createSign } from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const runtime = "nodejs";

type PublicationRequest = { kecamatan?: string; year?: string; catalog?: string; issn?: string; publication?: string };

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function privateKey() {
  const value = process.env.GOOGLE_PRIVATE_KEY || "";
  return value.includes("BEGIN PRIVATE KEY") ? value.replace(/\\n/g, "\n") : Buffer.from(value, "base64").toString("utf8");
}

async function accessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = privateKey();
  if (!email || !key) throw new Error("Kredensial Google Service Account belum lengkap");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signature = base64Url(createSign("RSA-SHA256").update(unsigned).sign(key));
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }) });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Gagal membuat akses Google Sheet");
  return result.access_token;
}

export async function POST(request: Request) {
  const sessionCookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!verifySession(sessionCookie)) return NextResponse.json({ ok: false, error: "Session tidak valid" }, { status: 401 });
  const body = await request.json().catch(() => null) as PublicationRequest | null;
  const values = [body?.kecamatan, body?.year, body?.catalog, body?.issn, body?.publication].map((value) => String(value || "").trim());
  if (values.some((value) => !value)) return NextResponse.json({ ok: false, error: "Identitas publikasi belum lengkap" }, { status: 400 });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_MASTER_SHEET_NAME || "HALAMAN DEPAN";
  if (!spreadsheetId) return NextResponse.json({ ok: false, error: "GOOGLE_SHEET_ID belum diatur" }, { status: 500 });
  try {
    const token = await accessToken();
    const range = encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!B1:B5`);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ majorDimension: "COLUMNS", values: [values] }) });
    const result = await response.json().catch(() => ({})) as { error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message || "Gagal memperbarui Google Sheet");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gagal memperbarui Google Sheet" }, { status: 500 });
  }
}
