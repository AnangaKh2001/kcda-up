export const DATASET_IDS = [
  "population",
  "age",
  "distance",
  "civilServants",
  "rtRw",
  "emisCurrent",
  "emisPrevious",
  "horticulture511",
  "horticulture512",
  "horticulture515",
  "horticulture516",
  "horticulture519",
  "horticulture5110",
  "horticulture5113",
] as const;

export type DatasetId = (typeof DATASET_IDS)[number];

export type DatasetInfo = {
  id: DatasetId;
  label: string;
  group: "Data Kecamatan" | "Survei Hortikultura" | "EMIS";
  target: string;
  description: string;
};

export const DATASETS: DatasetInfo[] = [
  {
    id: "population",
    label: "Jumlah Penduduk",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!A1:I266",
    description: "264 baris desa dan 2 baris header",
  },
  {
    id: "age",
    label: "Penduduk Menurut Umur",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!S1:V385",
    description: "384 baris kelompok umur dan 1 header",
  },
  {
    id: "distance",
    label: "Jarak Desa",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!AB1:AE265",
    description: "264 baris desa dan 1 header",
  },
  {
    id: "civilServants",
    label: "Jumlah PNS",
    group: "Data Kecamatan",
    target: "AG1:AK241 dan AM1:AP265",
    description: "Dua sheet: pendidikan dan desa",
  },
  {
    id: "rtRw",
    label: "Jumlah RT/RW",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!AR1:AU265",
    description: "264 baris desa dan 1 header",
  },
  {
    id: "emisCurrent",
    label: "EMIS N",
    group: "EMIS",
    target: "DATABASE EMIS!A1:BC27",
    description: "24 kecamatan dan 3 baris header",
  },
  {
    id: "emisPrevious",
    label: "EMIS N-1",
    group: "EMIS",
    target: "DATABASE EMIS N-1!A1:BC27",
    description: "24 kecamatan dan 3 baris header",
  },
  {
    id: "horticulture511",
    label: "Tabel 5.1.1",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!C3:L26",
    description: "Luas panen tanaman sayuran",
  },
  {
    id: "horticulture512",
    label: "Tabel 5.1.2",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!M3:V26",
    description: "Produksi tanaman sayuran",
  },
  {
    id: "horticulture515",
    label: "Tabel 5.1.5",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!W3:AD26",
    description: "Luas panen tanaman biofarmaka",
  },
  {
    id: "horticulture516",
    label: "Tabel 5.1.6",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AE3:AL26",
    description: "Produksi tanaman biofarmaka",
  },
  {
    id: "horticulture519",
    label: "Tabel 5.1.9",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AM3:AT26",
    description: "Luas panen tanaman hias",
  },
  {
    id: "horticulture5110",
    label: "Tabel 5.1.10",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AU3:BB26",
    description: "Produksi tanaman hias",
  },
  {
    id: "horticulture5113",
    label: "Tabel 5.1.13",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!BC3:BL26",
    description: "Produksi buah-buahan",
  },
];

export function isDatasetId(value: string): value is DatasetId {
  return DATASET_IDS.includes(value as DatasetId);
}
