import { createSign } from "node:crypto";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { ImportRange, validateDataset } from "@/lib/data-source-import";
import { DATASETS, DatasetId, isDatasetId } from "@/lib/data-source-types";

export const runtime = "nodejs";
export const maxDuration = 120;

function authenticated(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return Boolean(verifySession(value));
}
function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}
function privateKey() {
  const value = process.env.GOOGLE_PRIVATE_KEY || "";
  return value.includes("BEGIN PRIVATE KEY")
    ? value.replace(/\\n/g, "\n")
    : Buffer.from(value, "base64").toString("utf8");
}
async function accessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key = privateKey();
  if (!email || !key)
    throw new Error("Kredensial Google Service Account belum lengkap");
  const now = Math.floor(Date.now() / 1000),
    header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    claim = base64Url(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
    unsigned = `${header}.${claim}`;
  const assertion = `${unsigned}.${base64Url(createSign("RSA-SHA256").update(unsigned).sign(key))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !result.access_token)
    throw new Error(result.error_description || "Gagal membuat akses Google");
  return result.access_token;
}
async function googleJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const result = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(result.error?.message || "Permintaan Google Sheets gagal");
  return result;
}
function valuesUrl(path: string) {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID belum diatur");
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values${path}`;
}
async function readRanges(token: string, ranges: string[]) {
  const query = ranges
    .map((range) => `ranges=${encodeURIComponent(range)}`)
    .join("&");
  const result = await googleJson<{
    valueRanges?: { values?: (string | number | boolean)[][] }[];
  }>(
    valuesUrl(`:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`),
    token,
  );
  return ranges.map((range, index) => ({
    range,
    values: result.valueRanges?.[index]?.values || [],
  }));
}
async function clearRanges(token: string, ranges: string[]) {
  await googleJson(valuesUrl(":batchClear"), token, {
    method: "POST",
    body: JSON.stringify({ ranges }),
  });
}
async function writeRanges(
  token: string,
  ranges: { range: string; values: unknown[][] }[],
) {
  await googleJson(valuesUrl(":batchUpdate"), token, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: ranges.map((item) => ({
        range: item.range,
        majorDimension: "ROWS",
        values: item.values,
      })),
    }),
  });
}
function sameValues(expected: unknown[][], actual: unknown[][]) {
  for (let row = 0; row < expected.length; row++)
    for (let column = 0; column < expected[row].length; column++)
      if (
        String(expected[row][column] ?? "") !==
        String(actual[row]?.[column] ?? "")
      )
        return false;
  return true;
}

export async function POST(request: Request) {
  if (!authenticated(request))
    return new Response(
      JSON.stringify({ status: "error", error: "Session tidak valid" }) + "\n",
      { status: 401, headers: { "content-type": "application/x-ndjson" } },
    );
  const form = await request.formData();
  if (String(form.get("confirmation") || "") !== "YAKIN UPDATE")
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Pesan konfirmasi tidak sesuai",
      }) + "\n",
      { status: 400, headers: { "content-type": "application/x-ndjson" } },
    );
  const files = Array.from(form.entries()).filter(
    ([key, value]) => isDatasetId(key) && value instanceof File,
  ) as [DatasetId, File][];
  if (!files.length)
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Tidak ada file valid untuk diperbarui",
      }) + "\n",
      { status: 400, headers: { "content-type": "application/x-ndjson" } },
    );
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (value: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      const allRanges: ImportRange[] = [];
      let backup: { range: string; values: (string | number | boolean)[][] }[] =
        [];
      try {
        send({
          status: "progress",
          progress: 5,
          log: "Memulai validasi ulang file unggahan.",
        });
        for (let index = 0; index < files.length; index++) {
          const [dataset, file] = files[index],
            result = await validateDataset(file, dataset),
            label =
              DATASETS.find((item) => item.id === dataset)?.label || dataset;
          if (!result.valid)
            throw new Error(
              `${label} tidak valid: ${result.errors[0] || "struktur file tidak sesuai"}`,
            );
          allRanges.push(...result.ranges);
          send({
            status: "progress",
            progress: 10 + Math.round(((index + 1) / files.length) * 25),
            log: `${label} lolos validasi (${result.rows} baris).`,
          });
        }
        const token = await accessToken();
        send({
          status: "progress",
          progress: 42,
          log: "Kredensial Google berhasil disiapkan.",
        });
        backup = await readRanges(
          token,
          allRanges.map((item) => item.clearRange),
        );
        send({
          status: "progress",
          progress: 52,
          log: "Cadangan data lama berhasil disiapkan.",
        });
        await clearRanges(
          token,
          allRanges.map((item) => item.clearRange),
        );
        send({
          status: "progress",
          progress: 65,
          log: "Rentang database lama sudah dibersihkan.",
        });
        await writeRanges(
          token,
          allRanges.map((item) => ({ range: item.range, values: item.values })),
        );
        send({
          status: "progress",
          progress: 84,
          log: "Data baru berhasil ditulis ke master sheet.",
        });
        const written = await readRanges(
          token,
          allRanges.map((item) => item.range),
        );
        if (
          allRanges.some(
            (item, index) => !sameValues(item.values, written[index].values),
          )
        )
          throw new Error(
            "Verifikasi data gagal karena hasil Sheet berbeda dari file unggahan",
          );
        send({
          status: "success",
          progress: 100,
          log: "Database selesai diperbarui dan hasilnya telah diverifikasi.",
          updated: files.map(([id]) => id),
        });
      } catch (error) {
        if (backup.length) {
          try {
            const token = await accessToken();
            await clearRanges(
              token,
              backup.map((item) => item.range),
            );
            await writeRanges(token, backup);
            send({
              status: "progress",
              progress: 95,
              log: "Perubahan dibatalkan dan data lama berhasil dipulihkan.",
            });
          } catch {
            send({
              status: "progress",
              progress: 95,
              log: "Pemulihan otomatis gagal. Periksa master sheet sebelum mencoba kembali.",
            });
          }
        }
        send({
          status: "error",
          error:
            error instanceof Error ? error.message : "Update database gagal",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
