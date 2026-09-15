import ExcelJS from "exceljs";
import { DatasetId } from "@/lib/data-source-types";

export type ImportRange = {
  range: string;
  clearRange: string;
  values: (string | number | boolean)[][];
};
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  rows: number;
  ranges: ImportRange[];
};

const DISTRICTS = [
  "Metro Kibang",
  "Batanghari",
  "Sekampung",
  "Margatiga",
  "Sekampung Udik",
  "Jabung",
  "Pasir Sakti",
  "Waway Karya",
  "Marga Sekampung",
  "Labuhan Maringgai",
  "Mataram Baru",
  "Bandar Sribhawono",
  "Melinting",
  "Gunung Pelindung",
  "Way Jepara",
  "Braja Slebah",
  "Labuhan Ratu",
  "Sukadana",
  "Bumi Agung",
  "Batanghari Nuban",
  "Pekalongan",
  "Raman Utara",
  "Purbolinggo",
  "Way Bungur",
];
const AGE_GROUPS = [
  "0-4",
  "5-9",
  "10-14",
  "15-19",
  "20-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60-64",
  "65-69",
  "70-74",
  ">75",
];
const EDUCATION = [
  "Sekolah Dasar (SD) Primary School",
  "SMP/Sederajat Junior High School",
  "SMA/Sederajat Senior High School",
  "Diploma I/Akta I",
  "Diploma II/Akta II",
  "Diploma III/Akta III",
  "Diploma IV/Akta IV",
  "S1/Sarjana Under Graduate/Bachelor",
  "S2/Pasca Sarjana Graduate",
  "S3/Doktor/Ph.D Post Graduate",
];
const DISTRICT_ALIASES = new Set(
  [...DISTRICTS, "Braja Selebah"].map((item) => item.toLowerCase()),
);

function normalized(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
function cellValue(cell: ExcelJS.Cell): string | number | boolean {
  if (cell.isMerged && cell.address !== cell.master.address) return "";
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "richText" in value)
    return value.richText.map((part) => part.text).join("");
  if (typeof value === "object" && "formula" in value)
    return `=${value.formula}`;
  if (typeof value === "object" && "error" in value) return value.error;
  return normalized(cell.text);
}
function matrix(sheet: ExcelJS.Worksheet, rows: number, columns: number) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      cellValue(sheet.getCell(row + 1, column + 1)),
    ),
  );
}
function checkHeader(
  sheet: ExcelJS.Worksheet,
  expected: string[][],
  errors: string[],
) {
  expected.forEach((row, rowIndex) =>
    row.forEach((value, columnIndex) => {
      if (
        normalized(cellValue(sheet.getCell(rowIndex + 1, columnIndex + 1))) !==
        normalized(value)
      )
        errors.push(
          `${sheet.name}!${sheet.getCell(rowIndex + 1, columnIndex + 1).address}: header harus "${normalized(value)}".`,
        );
    }),
  );
}
function checkBounds(
  sheet: ExcelJS.Worksheet,
  maxRow: number,
  maxColumn: number,
  errors: string[],
) {
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) =>
    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      if (
        (rowNumber > maxRow || columnNumber > maxColumn) &&
        normalized(cellValue(cell))
      )
        errors.push(
          `${sheet.name}!${cell.address}: terdapat data di luar area template.`,
        );
    }),
  );
}
function checkRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  textColumns: number[],
  numericColumns: number[],
  errors: string[],
  allowDash = false,
) {
  for (let row = startRow; row <= endRow; row++) {
    for (const column of textColumns)
      if (!normalized(cellValue(sheet.getCell(row, column))))
        errors.push(
          `${sheet.name}!${sheet.getCell(row, column).address}: nilai wajib diisi.`,
        );
    for (const column of numericColumns) {
      const value = cellValue(sheet.getCell(row, column));
      if (value === "")
        errors.push(
          `${sheet.name}!${sheet.getCell(row, column).address}: angka wajib diisi.`,
        );
      else if (allowDash && normalized(value) === "-") continue;
      else if (typeof value !== "number" || !Number.isFinite(value))
        errors.push(
          `${sheet.name}!${sheet.getCell(row, column).address}: harus berupa angka, ditemukan "${normalized(value)}".`,
        );
    }
  }
}
function checkNoFormulas(sheet: ExcelJS.Worksheet, errors: string[]) {
  sheet.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (
        typeof cell.value === "object" &&
        cell.value &&
        ("formula" in cell.value || "error" in cell.value)
      )
        errors.push(
          `${sheet.name}!${cell.address}: formula atau error Excel tidak diperbolehkan.`,
        );
    }),
  );
}
function checkDistrict(
  value: unknown,
  expected: string,
  address: string,
  errors: string[],
) {
  if (normalized(value).toLowerCase() !== expected.toLowerCase())
    errors.push(`${address}: kecamatan harus "${expected}".`);
}
function oneSheet(workbook: ExcelJS.Workbook, errors: string[]) {
  if (
    workbook.worksheets.length !== 1 ||
    workbook.worksheets[0]?.name !== "Sheet1"
  )
    errors.push('Workbook harus memiliki tepat satu sheet bernama "Sheet1".');
  return workbook.getWorksheet("Sheet1");
}

const HORTICULTURE = {
  horticulture511: {
    table: "5.1.1",
    columns: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    headers: [
      "Bawang Merah",
      "Bawang Putih",
      "Bayam",
      "Buncis",
      "Cabai Rawit",
      "Kacang Panjang",
      "Kangkung",
      "Kembang Kol",
      "Kentang",
      "Ketimun",
    ],
    range: "'DATABASE HORTI'!C3:L26",
  },
  horticulture512: {
    table: "5.1.2",
    columns: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    headers: [
      "Bawang Merah",
      "Bawang Putih",
      "Bayam",
      "Buncis",
      "Cabai Rawit",
      "Kacang Panjang",
      "Kangkung",
      "Kembang Kol",
      "Kentang",
      "Ketimun",
    ],
    range: "'DATABASE HORTI'!M3:V26",
  },
  horticulture515: {
    table: "5.1.5",
    columns: [2, 3, 5, 6, 7, 9, 10, 11],
    headers: [
      "Jahe",
      "Kapulaga",
      "Kencur",
      "Kunyit",
      "Laos/Lengkuas",
      "Lidah Buaya",
      "Mahkota Dewa",
      "Mengkudu/Pace",
    ],
    range: "'DATABASE HORTI'!W3:AD26",
  },
  horticulture516: {
    table: "5.1.6",
    columns: [2, 3, 5, 6, 7, 9, 10, 11],
    headers: [
      "Jahe",
      "Kapulaga",
      "Kencur",
      "Kunyit",
      "Laos/Lengkuas",
      "Lidah Buaya",
      "Mahkota Dewa",
      "Mengkudu/Pace",
    ],
    range: "'DATABASE HORTI'!AE3:AL26",
  },
  horticulture519: {
    table: "5.1.9",
    columns: [2, 6, 7, 8, 9, 10, 16, 17],
    headers: [
      "Anthurium Bunga",
      "Krisan",
      "Mawar",
      "Melati",
      "Pakis",
      "Palem",
      "Sri Rejeki",
      "Anggrek Potong",
    ],
    range: "'DATABASE HORTI'!AM3:AT26",
  },
  horticulture5110: {
    table: "5.1.10",
    columns: [2, 6, 7, 8, 9, 10, 16, 17],
    headers: [
      "Anthurium Bunga",
      "Krisan",
      "Mawar",
      "Melati",
      "Pakis",
      "Palem",
      "Sri Rejeki",
      "Anggrek Potong",
    ],
    range: "'DATABASE HORTI'!AU3:BB26",
  },
  horticulture5113: {
    table: "5.1.13",
    columns: [2, 5, 6, 7, 8, 9, 12, 13, 14, 20],
    headers: [
      "Alpukat",
      "Belimbing",
      "Duku/Langsat/Kokosan",
      "Durian",
      "Jambu Air",
      "Jambu Biji",
      "Jeruk Siam/Keprok",
      "Mangga",
      "Manggis",
      "Pisang",
    ],
    range: "'DATABASE HORTI'!BC3:BL26",
  },
} as const;

function horticultureNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalized(value);
  if (text === "-") return 0;
  if (!/^-?[\d.]+(?:,\d+)?$/.test(text)) return null;
  const parsed = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateHorticulture(
  workbook: ExcelJS.Workbook,
  dataset: keyof typeof HORTICULTURE,
  errors: string[],
  ranges: ImportRange[],
) {
  const config = HORTICULTURE[dataset];
  const sheet = workbook.getWorksheet("Tabel");
  if (!sheet || !workbook.getWorksheet("Konsep Definisi")) {
    errors.push('Workbook harus memiliki sheet "Tabel" dan "Konsep Definisi".');
    return;
  }
  if (normalized(cellValue(sheet.getCell(1, 2))) !== config.table)
    errors.push(`Tabel!B1: nomor tabel harus "${config.table}".`);

  config.columns.forEach((column, index) => {
    const actual = normalized(
      cellValue(sheet.getCell(4, column)),
    ).toLowerCase();
    const expected = config.headers[index];
    if (!actual.includes(expected.toLowerCase()))
      errors.push(
        `Tabel!${sheet.getCell(4, column).address}: header harus memuat "${expected}".`,
      );
  });

  const values = DISTRICTS.map((district, index) => {
    const row = index + 8;
    checkDistrict(
      cellValue(sheet.getCell(row, 1)),
      district,
      `Tabel!A${row}`,
      errors,
    );
    return config.columns.map((column) => {
      const value = cellValue(sheet.getCell(row, column));
      const parsed = horticultureNumber(value);
      if (parsed === null)
        errors.push(
          `Tabel!${sheet.getCell(row, column).address}: harus berupa angka atau tanda "-", ditemukan "${normalized(value)}".`,
        );
      return parsed ?? 0;
    });
  });
  ranges.push({ range: config.range, clearRange: config.range, values });
}

export async function validateDataset(
  file: File,
  dataset: DatasetId,
): Promise<ValidationResult> {
  const errors: string[] = [];
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    return {
      valid: false,
      errors: ["File harus berformat .xlsx."],
      rows: 0,
      ranges: [],
    };
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
  } catch {
    return {
      valid: false,
      errors: ["File tidak dapat dibaca sebagai workbook Excel yang valid."],
      rows: 0,
      ranges: [],
    };
  }
  workbook.worksheets.forEach((sheet) => checkNoFormulas(sheet, errors));
  const ranges: ImportRange[] = [];
  const addSingle = (
    header: string[][],
    rows: number,
    columns: number,
    startRow: number,
    textColumns: number[],
    numericColumns: number[],
    range: string,
    clearRange = range,
  ) => {
    const sheet = oneSheet(workbook, errors);
    if (!sheet) return;
    checkHeader(sheet, header, errors);
    checkBounds(sheet, rows, columns, errors);
    checkRows(sheet, startRow, rows, textColumns, numericColumns, errors);
    ranges.push({ range, clearRange, values: matrix(sheet, rows, columns) });
  };
  if (dataset === "population")
    addSingle(
      [
        [
          "Kecamatan",
          "Desa",
          "Penduduk",
          "",
          "",
          "Persentase penduduk",
          "Kepadatan penduduk (per km2)",
          "rasio jenis kelamin",
          "Luas wilayah (km2)",
        ],
        ["", "", "Laki-laki", "Perempuan", "Jumlah", "", "", "", ""],
      ],
      266,
      9,
      3,
      [1, 2],
      [3, 4, 5, 6, 7, 8, 9],
      "'DATABASE PENDUDUK WILAYAH'!A1:I266",
    );
  if (dataset === "distance")
    addSingle(
      [
        [
          "Kecamatan",
          "Desa",
          "Jarak ke Ibukota Kecamatan",
          "Jarak ke ibukota provinsi",
        ],
      ],
      265,
      4,
      2,
      [1, 2],
      [3, 4],
      "'DATABASE PENDUDUK WILAYAH'!AB1:AE265",
    );
  if (dataset === "rtRw")
    addSingle(
      [["Kecamatan", "Desa", "Jumlah Dusun/RW", "Jumlah RT"]],
      265,
      4,
      2,
      [1, 2],
      [3, 4],
      "'DATABASE PENDUDUK WILAYAH'!AR1:AU265",
    );
  if (dataset === "age") {
    addSingle(
      [["Kecamatan", "Umur", "Laki-Laki", "Perempuan"]],
      385,
      4,
      2,
      [1, 2],
      [3, 4],
      "'DATABASE PENDUDUK WILAYAH'!S1:V385",
    );
    const sheet = workbook.getWorksheet("Sheet1");
    if (sheet) {
      const seen = new Set<string>();
      for (let block = 0; block < 24; block++) {
        const firstRow = 2 + block * 16;
        const district = normalized(cellValue(sheet.getCell(firstRow, 1)));
        if (!DISTRICT_ALIASES.has(district.toLowerCase()))
          errors.push(
            `${sheet.name}!A${firstRow}: nama kecamatan tidak dikenal.`,
          );
        if (seen.has(district.toLowerCase()))
          errors.push(
            `${sheet.name}!A${firstRow}: kecamatan "${district}" muncul lebih dari sekali.`,
          );
        seen.add(district.toLowerCase());
        for (let offset = 0; offset < 16; offset++) {
          const row = firstRow + offset;
          if (
            normalized(cellValue(sheet.getCell(row, 1))).toLowerCase() !==
            district.toLowerCase()
          )
            errors.push(
              `${sheet.name}!A${row}: harus tetap berisi kecamatan "${district}" untuk satu kelompok umur.`,
            );
          if (
            normalized(cellValue(sheet.getCell(row, 2))) !== AGE_GROUPS[offset]
          )
            errors.push(
              `${sheet.name}!B${row}: kelompok umur harus "${AGE_GROUPS[offset]}".`,
            );
        }
      }
    }
  }
  if (dataset === "civilServants") {
    if (
      workbook.worksheets.length !== 2 ||
      !workbook.getWorksheet("Berdasarkan Tingkat Pendidikan") ||
      !workbook.getWorksheet("Berdasarkan Desa")
    )
      errors.push(
        'Workbook PNS harus berisi sheet "Berdasarkan Tingkat Pendidikan" dan "Berdasarkan Desa".',
      );
    const education = workbook.getWorksheet("Berdasarkan Tingkat Pendidikan"),
      village = workbook.getWorksheet("Berdasarkan Desa");
    if (education) {
      checkHeader(
        education,
        [
          [
            "Kecamatan",
            "Tingkat Pendidikan",
            "Laki-laki",
            "Perempuan",
            "Jumlah",
          ],
        ],
        errors,
      );
      checkBounds(education, 241, 5, errors);
      checkRows(education, 2, 241, [1, 2], [3, 4, 5], errors);
      for (let i = 0; i < 240; i++) {
        const row = i + 2,
          district = DISTRICTS[Math.floor(i / 10)],
          level = EDUCATION[i % 10];
        checkDistrict(
          cellValue(education.getCell(row, 1)),
          district,
          `${education.name}!A${row}`,
          errors,
        );
        if (normalized(cellValue(education.getCell(row, 2))) !== level)
          errors.push(
            `${education.name}!B${row}: tingkat pendidikan tidak sesuai urutan template.`,
          );
      }
      ranges.push({
        range: "'DATABASE PENDUDUK WILAYAH'!AG1:AK241",
        clearRange: "'DATABASE PENDUDUK WILAYAH'!AG1:AK241",
        values: matrix(education, 241, 5),
      });
    }
    if (village) {
      checkHeader(
        village,
        [["Kecamatan", "Desa", "Laki-laki", "Perempuan"]],
        errors,
      );
      checkBounds(village, 265, 4, errors);
      checkRows(village, 2, 265, [1, 2], [3, 4], errors);
      ranges.push({
        range: "'DATABASE PENDUDUK WILAYAH'!AM1:AP265",
        clearRange: "'DATABASE PENDUDUK WILAYAH'!AM1:AP267",
        values: matrix(village, 265, 4),
      });
    }
  }
  if (dataset === "emisCurrent" || dataset === "emisPrevious") {
    const sheet = oneSheet(workbook, errors),
      target =
        dataset === "emisCurrent"
          ? "'DATABASE EMIS'!A1:BC27"
          : "'DATABASE EMIS N-1'!A1:BC27";
    if (sheet) {
      checkBounds(sheet, 27, 55, errors);
      checkRows(
        sheet,
        4,
        27,
        [1],
        Array.from({ length: 54 }, (_, index) => index + 2),
        errors,
        true,
      );
      if (normalized(cellValue(sheet.getCell(1, 1))) !== "Kecamatan District")
        errors.push(
          `${sheet.name}!A1: header kecamatan tidak sesuai template EMIS.`,
        );
      const groups = ["TK", "RA", "SD", "MI", "SMP", "MTS", "SMA", "SMK", "MA"];
      groups.forEach((group, index) => {
        const start = 2 + index * 6;
        if (normalized(cellValue(sheet.getCell(1, start))) !== group)
          errors.push(
            `${sheet.name}!${sheet.getCell(1, start).address}: header harus "${group}".`,
          );
        const labels =
          index === 8
            ? [
                [0, "Peserta Didik/ Pupils"],
                [2, "Satuan Pendidikan/ Schools"],
                [4, "Kepala Sekolah dan Pendidik/ Headmasters and Teachers"],
              ]
            : [
                [0, "Satuan Pendidikan/ Schools"],
                [2, "Kepala Sekolah dan Pendidik/ Headmasters and Teachers"],
                [4, "Peserta Didik/ Pupils"],
              ];
        labels.forEach(([offset, label]) => {
          if (
            normalized(cellValue(sheet.getCell(2, start + Number(offset)))) !==
            label
          )
            errors.push(
              `${sheet.name}!${sheet.getCell(2, start + Number(offset)).address}: subheader EMIS tidak sesuai.`,
            );
        });
        for (let offset = 0; offset < 6; offset++) {
          const expected =
            offset % 2 === 0 ? "Negeri Public" : "Swasta Private";
          if (
            normalized(cellValue(sheet.getCell(3, start + offset))) !== expected
          )
            errors.push(
              `${sheet.name}!${sheet.getCell(3, start + offset).address}: header status harus "${expected}".`,
            );
        }
      });
      DISTRICTS.forEach((district, index) =>
        checkDistrict(
          cellValue(sheet.getCell(index + 4, 1)),
          district,
          `${sheet.name}!A${index + 4}`,
          errors,
        ),
      );
      ranges.push({
        range: target,
        clearRange: target,
        values: matrix(sheet, 27, 55),
      });
    }
  }
  if (dataset in HORTICULTURE)
    validateHorticulture(
      workbook,
      dataset as keyof typeof HORTICULTURE,
      errors,
      ranges,
    );
  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 40),
    rows: ranges.reduce((sum, item) => sum + item.values.length, 0),
    ranges,
  };
}
