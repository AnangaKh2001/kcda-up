import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionGoogleAccessToken,
  verifySession,
} from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

type PublicationRequest = {
  kecamatan?: string;
  year?: string;
  catalog?: string;
  issn?: string;
  publication?: string;
  director?: string;
  responsible?: string;
  editor?: string;
  dataProcessor?: string;
  layout?: string;
  translator?: string;
};
type SheetColor = { red?: number; green?: number; blue?: number };
type DynamicRow = {
  type: "data" | "total" | "district";
  values: string[];
  backgroundColor?: SheetColor;
};
type TableConfig = {
  marker: string;
  range: string;
  columns: number[];
  headerRows: number;
  dataStart: number;
  stop: RegExp;
  hasBottomTotal?: boolean;
  districtVillages?: boolean;
};
type DocsStructuralElement = {
  startIndex?: number;
  endIndex?: number;
  paragraph?: {
    elements?: {
      startIndex?: number;
      endIndex?: number;
      textRun?: { content?: string };
    }[];
  };
  table?: {
    rows?: number;
    columns?: number;
    tableRows?: { tableCells?: { content?: DocsStructuralElement[] }[] }[];
  };
};
type CellReplacement = {
  startIndex: number;
  endIndex: number;
  text: string;
  italicStartOffset?: number;
};
type SheetGridCell = {
  formattedValue?: string;
  effectiveValue?: { stringValue?: string; numberValue?: number };
  effectiveFormat?: {
    backgroundColor?: SheetColor;
    backgroundColorStyle?: { rgbColor?: SheetColor };
  };
};
type SheetGridRow = { values?: SheetGridCell[] };
type SheetGridData = { rowData?: SheetGridRow[] };

const TABLES: TableConfig[] = [
  {
    marker: "{{TABLE_1_1}}",
    range: "'BAB 1'!A55:F120",
    columns: [2, 3, 4],
    headerRows: 3,
    dataStart: 6,
    stop: /Sumber\/Source:|Tabel 1\.2/i,
    hasBottomTotal: true,
  },
  {
    marker: "{{TABLE_1_2}}",
    range: "'BAB 1'!A55:F120",
    columns: [2, 3, 4],
    headerRows: 3,
    dataStart: 38,
    stop: /Sumber\/Source:/i,
  },
  {
    marker: "{{TABLE_2_1_1}}",
    range: "'BAB 2'!A57:F125",
    columns: [2, 3, 4],
    headerRows: 3,
    dataStart: 6,
    stop: /Sumber\/Source:|Tabel 2\.2/i,
    hasBottomTotal: true,
  },
  {
    marker: "{{TABLE_2_2_1}}",
    range: "'BAB 2'!A57:F125",
    columns: [2, 3, 4, 5],
    headerRows: 2,
    dataStart: 38,
    stop: /Sumber\/Source:|Tabel 2\.2\.2/i,
    districtVillages: true,
  },
  {
    marker: "{{TABLE_3_1}}",
    range: "'BAB 3'!A56:F120",
    columns: [2, 3, 4, 5],
    headerRows: 3,
    dataStart: 6,
    stop: /Lanjutan|Sumber\/Source:/i,
    hasBottomTotal: true,
  },
  {
    marker: "{{TABLE_3_1_LANJUTAN}}",
    range: "'BAB 3'!A56:F120",
    columns: [2, 3, 4, 5],
    headerRows: 3,
    dataStart: 35,
    stop: /Sumber\/Source:|Tabel 3\.2/i,
    hasBottomTotal: true,
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDistrictGovernment(label: string, text: string) {
  const cleanLabel = titleCase(label || text);
  if (/Pemerintah Kecamatan/i.test(text))
    return `Pemerintah Kecamatan ${cleanLabel}\n${cleanLabel} District Government`;
  if (/Pemerintah Desa/i.test(text))
    return `Pemerintah Desa ${cleanLabel}\n${cleanLabel} Village Government`;
  return text;
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
    throw new Error(result.error?.message || "Permintaan Google API gagal");
  return result;
}

function teamValue(value?: string, multiple = false) {
  const clean = String(value || "").trim();
  if (!multiple) return clean;
  return clean
    .split(/\s*(?:•|\r?\n|;|,)\s*/)
    .filter(Boolean)
    .join(" • ");
}

async function readPublicationMetadata(token: string) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_MASTER_SHEET_NAME || "HALAMAN DEPAN";
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID belum diatur");
  const ranges = [
    `'${sheetName.replace(/'/g, "''")}'!B1:B5`,
    "'HALAMAN INFO'!A63",
    "'HALAMAN INFO'!A66",
    "'HALAMAN INFO'!A69",
    "'HALAMAN INFO'!A72",
    "'HALAMAN INFO'!A75",
    "'HALAMAN INFO'!A78",
  ];
  const query = ranges
    .map((range) => `ranges=${encodeURIComponent(range)}`)
    .join("&");
  const result = await googleJson<{ valueRanges?: { values?: unknown[][] }[] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}&majorDimension=COLUMNS`,
    token,
  );
  const identity = (result.valueRanges?.[0]?.values?.[0] || []).map((value) =>
    String(value ?? ""),
  );
  const team = ranges
    .slice(1)
    .map((_, index) =>
      String(result.valueRanges?.[index + 1]?.values?.[0]?.[0] ?? ""),
    );
  return {
    kecamatan: titleCase(identity[0] || ""),
    year: identity[1] || "",
    catalog: identity[2] || "",
    issn: identity[3] || "",
    publication: identity[4] || "",
    director: team[0],
    responsible: team[1],
    editor: team[2],
    dataProcessor: team[3]
      .split(/\s*•\s*/)
      .filter(Boolean)
      .join("\n"),
    layout: team[4],
    translator: team[5],
  };
}

async function updatePublicationMetadata(
  token: string,
  body: PublicationRequest,
  identity: string[],
) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_MASTER_SHEET_NAME || "HALAMAN DEPAN";
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID belum diatur");
  const data = [
    {
      range: `'${sheetName.replace(/'/g, "''")}'!B1:B5`,
      majorDimension: "COLUMNS",
      values: [identity],
    },
    { range: "'HALAMAN INFO'!A63", values: [[teamValue(body.director)]] },
    { range: "'HALAMAN INFO'!A66", values: [[teamValue(body.responsible)]] },
    { range: "'HALAMAN INFO'!A69", values: [[teamValue(body.editor)]] },
    {
      range: "'HALAMAN INFO'!A72",
      values: [[teamValue(body.dataProcessor, true)]],
    },
    { range: "'HALAMAN INFO'!A75", values: [[teamValue(body.layout)]] },
    { range: "'HALAMAN INFO'!A78", values: [[teamValue(body.translator)]] },
  ];
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    },
  );
}

async function readFooterDistrict(token: string) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = "BAB 1";
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID belum diatur");
  const range = `'${sheetName.replace(/'/g, "''")}'!G3`;
  const result = await googleJson<{ values?: unknown[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    token,
  );
  const value = String(result.values?.[0]?.[0] ?? "").trim();
  if (!value) throw new Error(`Nilai footer pada ${sheetName}!G3 kosong`);
  return value;
}

async function replaceFooterDistrict(
  token: string,
  documentId: string,
  footerDistrict: string,
) {
  const document = await getDocument(token, documentId);
  const { tabId, footers } = documentParts(document);
  const markers = ["{{FOOTER_KECAMATAN}}", "{{FOOTER KECAMATAN}}"];
  const requests: Record<string, unknown>[] = [];

  for (const [footerId, footer] of Object.entries(footers)) {
    const match = findTextRange(footer.content || [], markers);
    if (!match) continue;
    const segmentRange = {
      segmentId: footerId,
      startIndex: match.startIndex,
      endIndex: match.endIndex,
      ...(tabId ? { tabId } : {}),
    };
    requests.push(
      { deleteContentRange: { range: segmentRange } },
      {
        insertText: {
          location: {
            segmentId: footerId,
            index: match.startIndex,
            ...(tabId ? { tabId } : {}),
          },
          text: footerDistrict,
        },
      },
    );
  }

  if (!requests.length)
    throw new Error("Tag {{FOOTER_KECAMATAN}} tidak ditemukan di footer");
  await docsBatchUpdate(token, documentId, requests);
}

async function prepareDocument(token: string, kecamatan: string, year: string) {
  const templateId = process.env.GOOGLE_DOC_TEMPLATE_ID;
  const folderId = process.env.GOOGLE_OUTPUT_FOLDER_ID;
  if (!templateId) throw new Error("GOOGLE_DOC_TEMPLATE_ID belum diatur");
  if (process.env.GOOGLE_USE_EXISTING_DOC === "true") {
    return googleJson<{ id: string; name: string; webViewLink?: string }>(
      `https://www.googleapis.com/drive/v3/files/${templateId}?fields=id,name,webViewLink&supportsAllDrives=true`,
      token,
    );
  }
  if (!folderId) throw new Error("GOOGLE_OUTPUT_FOLDER_ID belum diatur");
  return googleJson<{ id: string; name: string; webViewLink?: string }>(
    `https://www.googleapis.com/drive/v3/files/${templateId}/copy?fields=id,name,webViewLink&supportsAllDrives=true`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name: `KCDA ${titleCase(kecamatan)} ${year}`,
        parents: [folderId],
      }),
    },
  );
}

async function readSheetTables(token: string, kecamatan: string) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID belum diatur");
  const entries = await Promise.all(
    TABLES.map(async (config) => {
      const result = await googleJson<{
        sheets?: { data?: SheetGridData[] }[];
      }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&ranges=${encodeURIComponent(config.range)}&fields=sheets(data(rowData(values(formattedValue,effectiveValue,effectiveFormat(backgroundColor,backgroundColorStyle)))))`,
        token,
      );
      const grid = result.sheets?.[0]?.data?.[0]?.rowData || [];
      return [config.marker, extractRows(grid, config, kecamatan)] as const;
    }),
  );
  return new Map(entries);
}

function cellDisplayValue(cell: SheetGridCell) {
  const raw =
    cell?.formattedValue ??
    cell?.effectiveValue?.stringValue ??
    cell?.effectiveValue?.numberValue ??
    "";
  return String(raw).replace(/\s+/g, " ").trim();
}

function cellBackground(cell: SheetGridCell | undefined) {
  return (
    cell?.effectiveFormat?.backgroundColorStyle?.rgbColor ||
    cell?.effectiveFormat?.backgroundColor
  );
}

function extractRows(
  values: SheetGridRow[],
  config: TableConfig,
  kecamatan: string,
): DynamicRow[] {
  const rows: DynamicRow[] = [];
  const kecamatanKey = normalize(kecamatan);
  for (let index = config.dataStart; index < values.length; index++) {
    const cells = values[index]?.values || [];
    const sourceRow = cells.map(cellDisplayValue);
    const joined = sourceRow.join(" ");
    if (config.stop.test(joined)) break;
    if (sourceRow.some((value) => /#REF!|#VALUE!|#N\/A/i.test(value))) continue;
    const picked = config.columns.map((column) => sourceRow[column] || "");
    // Kolom pertama adalah identitas desa/pemerintah. Rumus bernilai 0 pada
    // kolom angka tidak boleh membuat baris desa kosong ikut diterbitkan.
    if (!picked[0]) continue;
    if (/^Sumber\/Source:/i.test(picked.join(" "))) break;
    const rowLabel = normalize(sourceRow[1] || picked[0] || "");
    const type =
      config.districtVillages && rowLabel === kecamatanKey
        ? "district"
        : normalize(picked[0] || "") === kecamatanKey
          ? "total"
          : "data";
    if (config.districtVillages)
      picked[0] = formatDistrictGovernment(
        sourceRow[1] || picked[0],
        picked[0],
      );
    rows.push({
      type,
      values: picked,
      backgroundColor: cellBackground(cells[config.columns[0]]),
    });
    if (config.hasBottomTotal && type === "total") break;
  }
  return rows;
}

async function getDocument(token: string, documentId: string) {
  return googleJson<{
    title?: string;
    tabs?: {
      tabProperties?: { tabId?: string };
      documentTab?: {
        body?: { content?: DocsStructuralElement[] };
        footers?: Record<string, { content?: DocsStructuralElement[] }>;
      };
    }[];
    body?: { content?: DocsStructuralElement[] };
    footers?: Record<string, { content?: DocsStructuralElement[] }>;
  }>(
    `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`,
    token,
  );
}

function documentParts(document: Awaited<ReturnType<typeof getDocument>>) {
  const tab = document.tabs?.[0];
  return {
    tabId: tab?.tabProperties?.tabId,
    content: tab?.documentTab?.body?.content || document.body?.content || [],
    footers: tab?.documentTab?.footers || document.footers || {},
  };
}

function documentContent(document: Awaited<ReturnType<typeof getDocument>>) {
  const { tabId, content } = documentParts(document);
  return { tabId, content };
}

function findTextRange(
  content: DocsStructuralElement[],
  markers: string[],
): { startIndex: number; endIndex: number } | null {
  for (const element of content) {
    const paragraphElements = element.paragraph?.elements || [];
    for (const item of paragraphElements) {
      const text = item.textRun?.content || "";
      const marker = markers.find((candidate) => text.includes(candidate));
      if (marker && typeof item.startIndex === "number") {
        const offset = text.indexOf(marker);
        return {
          startIndex: item.startIndex + offset,
          endIndex: item.startIndex + offset + marker.length,
        };
      }
    }
    for (const row of element.table?.tableRows || []) {
      for (const cell of row.tableCells || []) {
        const match = findTextRange(cell.content || [], markers);
        if (match) return match;
      }
    }
  }
  return null;
}

function elementText(element: DocsStructuralElement): string {
  if (element.paragraph)
    return (element.paragraph.elements || [])
      .map((item) => item.textRun?.content || "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  if (element.table)
    return (element.table.tableRows || [])
      .flatMap((row) => row.tableCells || [])
      .map((cell) => (cell.content || []).map(elementText).join(" "))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  return "";
}

function findMarker(content: DocsStructuralElement[], marker: string) {
  for (let index = 0; index < content.length; index++) {
    if (elementText(content[index]).includes(marker))
      return { index, element: content[index] };
  }
  throw new Error(`Marker ${marker} tidak ditemukan di Google Docs`);
}

function nextTable(content: DocsStructuralElement[], fromIndex: number) {
  for (let index = fromIndex + 1; index < content.length; index++) {
    if (content[index].table && typeof content[index].startIndex === "number")
      return content[index];
  }
  throw new Error("Tabel setelah marker tidak ditemukan di Google Docs");
}

function tableStartLocation(table: DocsStructuralElement, tabId?: string) {
  return { index: table.startIndex, ...(tabId ? { tabId } : {}) };
}

async function docsBatchUpdate(
  token: string,
  documentId: string,
  requests: Record<string, unknown>[],
) {
  for (let index = 0; index < requests.length; index += 400) {
    await googleJson(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ requests: requests.slice(index, index + 400) }),
      },
    );
  }
}

async function shapeTable(
  token: string,
  documentId: string,
  config: TableConfig,
  rows: DynamicRow[],
) {
  const doc = await getDocument(token, documentId);
  const { tabId, content } = documentContent(doc);
  const marker = findMarker(content, config.marker);
  const table = nextTable(content, marker.index);
  const tableRows = table.table?.rows || table.table?.tableRows?.length || 0;
  const tableLocation = tableStartLocation(table, tabId);
  const dataRows = config.districtVillages
    ? rows.filter((row) => row.type === "data")
    : rows.filter((row) => row.type === "data");
  const desiredRows = config.headerRows + rows.length;
  const insertAfterRow = config.districtVillages
    ? config.headerRows + 1
    : config.headerRows;
  const rowsToInsert = Math.max(0, dataRows.length - 1);
  const rowCountAfterInsert = tableRows + rowsToInsert;
  const surplusRows = Math.max(0, rowCountAfterInsert - desiredRows);
  const requests: Record<string, unknown>[] = [];
  for (let index = 0; index < rowsToInsert; index++) {
    requests.push({
      insertTableRow: {
        tableCellLocation: {
          tableStartLocation: tableLocation,
          rowIndex: insertAfterRow,
          columnIndex: 0,
        },
        insertBelow: true,
      },
    });
  }
  for (let index = 0; index < surplusRows; index++) {
    requests.push({
      deleteTableRow: {
        tableCellLocation: {
          tableStartLocation: tableLocation,
          rowIndex: rowCountAfterInsert - 1 - index,
          columnIndex: 0,
        },
      },
    });
  }
  if (requests.length) await docsBatchUpdate(token, documentId, requests);
}

function cellTextRange(cell: { content?: DocsStructuralElement[] }) {
  const runs = (cell.content || [])
    .flatMap((element) => element.paragraph?.elements || [])
    .filter(
      (element) =>
        typeof element.startIndex === "number" &&
        typeof element.endIndex === "number",
    );
  const first = runs[0];
  const last = runs[runs.length - 1];
  if (
    !first ||
    !last ||
    typeof first.startIndex !== "number" ||
    typeof last.endIndex !== "number"
  )
    return null;
  return {
    startIndex: first.startIndex,
    endIndex: Math.max(first.startIndex, last.endIndex - 1),
  };
}

function orderedTableRows(config: TableConfig, rows: DynamicRow[]) {
  return config.districtVillages
    ? [
        ...rows.filter((row) => row.type === "district"),
        ...rows.filter((row) => row.type === "data"),
      ]
    : [
        ...rows.filter((row) => row.type === "data"),
        ...rows.filter((row) => row.type === "total"),
      ];
}

function docsColor(color?: SheetColor) {
  const rgbColor =
    color && typeof color === "object"
      ? { red: color.red ?? 0, green: color.green ?? 0, blue: color.blue ?? 0 }
      : { red: 1, green: 1, blue: 1 };
  return { color: { rgbColor } };
}

function fillRequests(
  table: DocsStructuralElement,
  config: TableConfig,
  rows: DynamicRow[],
) {
  const tableRows = table.table?.tableRows || [];
  const orderedRows = orderedTableRows(config, rows);
  const replacements: CellReplacement[] = [];
  orderedRows.forEach((row, rowOffset) => {
    const tableRow = tableRows[config.headerRows + rowOffset];
    (tableRow?.tableCells || []).forEach((cell, columnIndex) => {
      const range = cellTextRange(cell);
      const text = row.values[columnIndex] || "";
      const lineBreak =
        config.districtVillages && columnIndex === 0 ? text.indexOf("\n") : -1;
      if (range)
        replacements.push({
          ...range,
          text,
          italicStartOffset: lineBreak >= 0 ? lineBreak + 1 : undefined,
        });
    });
  });
  return replacements
    .sort((a, b) => b.startIndex - a.startIndex)
    .flatMap((replacement) => {
      const requests: Record<string, unknown>[] = [];
      if (replacement.endIndex > replacement.startIndex)
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: replacement.startIndex,
              endIndex: replacement.endIndex,
            },
          },
        });
      if (replacement.text)
        requests.push({
          insertText: {
            location: { index: replacement.startIndex },
            text: replacement.text,
          },
        });
      if (
        replacement.text &&
        typeof replacement.italicStartOffset === "number"
      ) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex:
                replacement.startIndex + replacement.italicStartOffset,
              endIndex: replacement.startIndex + replacement.text.length,
            },
            textStyle: { italic: true },
            fields: "italic",
          },
        });
      }
      return requests;
    });
}

function markerDeleteRequests(element: DocsStructuralElement, tabId?: string) {
  return (element.paragraph?.elements || [])
    .flatMap((run) => {
      const text = run.textRun?.content || "";
      if (
        !text ||
        typeof run.startIndex !== "number" ||
        typeof run.endIndex !== "number"
      )
        return [];
      const endIndex = text.endsWith("\n") ? run.endIndex - 1 : run.endIndex;
      if (endIndex <= run.startIndex) return [];
      return [
        {
          deleteContentRange: {
            range: {
              startIndex: run.startIndex,
              endIndex,
              ...(tabId ? { tabId } : {}),
            },
          },
        },
      ];
    })
    .sort((a, b) => {
      const rangeA = a.deleteContentRange.range;
      const rangeB = b.deleteContentRange.range;
      return rangeB.startIndex - rangeA.startIndex;
    });
}

async function fillTable(
  token: string,
  documentId: string,
  config: TableConfig,
  rows: DynamicRow[],
) {
  const doc = await getDocument(token, documentId);
  const { tabId, content } = documentContent(doc);
  const marker = findMarker(content, config.marker);
  const table = nextTable(content, marker.index);
  const tableLocation = tableStartLocation(table, tabId);
  const columnSpan =
    table.table?.columns ||
    table.table?.tableRows?.[0]?.tableCells?.length ||
    config.columns.length;
  const orderedRows = orderedTableRows(config, rows);
  const styleRequests = orderedRows.map((row, offset) => ({
    updateTableCellStyle: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: tableLocation,
          rowIndex: config.headerRows + offset,
          columnIndex: 0,
        },
        rowSpan: 1,
        columnSpan,
      },
      tableCellStyle: { backgroundColor: docsColor(row.backgroundColor) },
      fields: "backgroundColor",
    },
  }));
  const requests = [
    ...fillRequests(table, config, rows),
    ...styleRequests,
    ...markerDeleteRequests(marker.element, tabId),
  ];
  if (requests.length) await docsBatchUpdate(token, documentId, requests);
}

async function removeMarkers(token: string, documentId: string) {
  const markerFragments = ["{{TA"];
  await docsBatchUpdate(
    token,
    documentId,
    [...TABLES.map((table) => table.marker), ...markerFragments].map(
      (marker) => ({
        replaceAllText: {
          containsText: { text: marker, matchCase: true },
          replaceText: "",
        },
      }),
    ),
  );
}

function requestSession(request: Request) {
  const sessionCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySession(sessionCookie);
}

export async function GET(request: Request) {
  const session = requestSession(request);
  if (!session)
    return NextResponse.json(
      { ok: false, error: "Session tidak valid" },
      { status: 401 },
    );
  try {
    const token = await sessionGoogleAccessToken(session);
    return NextResponse.json({
      ok: true,
      metadata: await readPublicationMetadata(token),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal membaca data master",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = requestSession(request);
  if (!session)
    return NextResponse.json(
      { ok: false, error: "Session tidak valid" },
      { status: 401 },
    );
  const body = (await request
    .json()
    .catch(() => null)) as PublicationRequest | null;
  const values = [
    body?.kecamatan,
    body?.year,
    body?.catalog,
    body?.issn,
    body?.publication,
  ].map((value) => String(value || "").trim());
  if (values.some((value) => !value))
    return NextResponse.json(
      { ok: false, error: "Identitas publikasi belum lengkap" },
      { status: 400 },
    );
  const [kecamatan, year] = values;
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        let token = "";
        let copyId = "";
        try {
          send({
            status: "progress",
            progress: 5,
            log: "Menyiapkan akses Google.",
          });
          token = await sessionGoogleAccessToken(session);
          send({
            status: "progress",
            progress: 14,
            log: `Akses Google ${session.email} berhasil disiapkan.`,
          });

          await updatePublicationMetadata(token, body || {}, values);
          send({
            status: "progress",
            progress: 26,
            log: "Identitas publikasi dan tim penyusun diperbarui di master sheet.",
          });

          const tableRows = await readSheetTables(token, kecamatan);
          send({
            status: "progress",
            progress: 36,
            log: "Data tabel dinamis selesai dihitung dan dibaca dari master sheet.",
          });

          const copy = await prepareDocument(token, kecamatan, year);
          copyId = copy.id;
          send({
            status: "progress",
            progress: 48,
            log:
              process.env.GOOGLE_USE_EXISTING_DOC === "true"
                ? `Dokumen target siap diproses: ${copy.name}.`
                : `Dokumen output dibuat: ${copy.name}.`,
          });

          const footerDistrict = await readFooterDistrict(token);
          await replaceFooterDistrict(token, copy.id, footerDistrict);
          send({
            status: "progress",
            progress: 50,
            log: "Nama kecamatan pada footer diperbarui dari BAB 1!G3.",
          });

          for (let index = 0; index < TABLES.length; index++) {
            const config = TABLES[index];
            const rows = tableRows.get(config.marker) || [];
            if (!rows.length)
              throw new Error(`Data untuk ${config.marker} kosong`);
            await shapeTable(token, copy.id, config, rows);
            await fillTable(token, copy.id, config, rows);
            send({
              status: "progress",
              progress: 48 + Math.round(((index + 1) / TABLES.length) * 42),
              log: `${config.marker} diisi (${rows.length} baris).`,
            });
          }
          send({
            status: "progress",
            progress: 96,
            log: "Menghapus marker teknis dari dokumen output.",
          });
          await removeMarkers(token, copy.id);
          const documentUrl =
            copy.webViewLink ||
            `https://docs.google.com/document/d/${copy.id}/edit`;
          send({
            status: "success",
            progress: 100,
            log: "Marker teknis dihapus dan publikasi selesai dibuat.",
            documentId: copy.id,
            documentUrl,
          });
        } catch (error) {
          if (
            token &&
            copyId &&
            process.env.GOOGLE_USE_EXISTING_DOC !== "true"
          ) {
            try {
              await googleJson(
                `https://www.googleapis.com/drive/v3/files/${copyId}?supportsAllDrives=true`,
                token,
                { method: "PATCH", body: JSON.stringify({ trashed: true }) },
              );
              send({
                status: "progress",
                progress: 98,
                log: "Dokumen output yang belum selesai dipindahkan ke Trash.",
              });
            } catch {
              send({
                status: "progress",
                progress: 98,
                log: "Dokumen output belum selesai tidak dapat dibersihkan otomatis.",
              });
            }
          }
          send({
            status: "error",
            progress: 100,
            error:
              error instanceof Error
                ? error.message
                : "Gagal membuat publikasi",
          });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
