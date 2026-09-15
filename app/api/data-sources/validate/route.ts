import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { validateDataset } from "@/lib/data-source-import";
import { isDatasetId } from "@/lib/data-source-types";

export const runtime = "nodejs";

function authenticated(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return Boolean(verifySession(value));
}

export async function POST(request: Request) {
  if (!authenticated(request))
    return NextResponse.json(
      { ok: false, error: "Session tidak valid" },
      { status: 401 },
    );
  const form = await request.formData();
  const dataset = String(form.get("dataset") || "");
  const file = form.get("file");
  if (!isDatasetId(dataset) || !(file instanceof File))
    return NextResponse.json(
      { ok: false, error: "Dataset atau file tidak valid" },
      { status: 400 },
    );
  const result = await validateDataset(file, dataset);
  return NextResponse.json(
    {
      ok: result.valid,
      valid: result.valid,
      errors: result.errors,
      rows: result.rows,
    },
    { status: result.valid ? 200 : 422 },
  );
}
