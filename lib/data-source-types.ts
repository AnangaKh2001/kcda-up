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
  templatePath: string;
};

export const DATASETS: DatasetInfo[] = [
  {
    id: "population",
    label: "Jumlah Penduduk",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!A1:I266",
    description: "264 baris desa dan 2 baris header",
    templatePath: "/templates/template-jumlah-penduduk.xlsx",
  },
  {
    id: "age",
    label: "Penduduk Menurut Umur",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!S1:V385",
    description: "384 baris kelompok umur dan 1 header",
    templatePath: "/templates/template-umur.xlsx",
  },
  {
    id: "distance",
    label: "Jarak Desa",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!AB1:AE265",
    description: "264 baris desa dan 1 header",
    templatePath: "/templates/template-jarak-desa.xlsx",
  },
  {
    id: "civilServants",
    label: "Jumlah PNS",
    group: "Data Kecamatan",
    target: "AG1:AK241 dan AM1:AP265",
    description: "Dua sheet: pendidikan dan desa",
    templatePath: "/templates/template-jumlah-pns.xlsx",
  },
  {
    id: "rtRw",
    label: "Jumlah RT/RW",
    group: "Data Kecamatan",
    target: "DATABASE PENDUDUK WILAYAH!AR1:AU265",
    description: "264 baris desa dan 1 header",
    templatePath: "/templates/template-jumlah-rt-rw.xlsx",
  },
  {
    id: "emisCurrent",
    label: "EMIS N",
    group: "EMIS",
    target: "DATABASE EMIS!A1:BC27",
    description: "24 kecamatan dan 3 baris header",
    templatePath: "/templates/template-emis-n.xlsx",
  },
  {
    id: "emisPrevious",
    label: "EMIS N-1",
    group: "EMIS",
    target: "DATABASE EMIS N-1!A1:BC27",
    description: "24 kecamatan dan 3 baris header",
    templatePath: "/templates/template-emis-n-1.xlsx",
  },
  {
    id: "horticulture511",
    label: "Tabel 5.1.1",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!C3:L26",
    description: "Luas panen tanaman sayuran",
    templatePath: "/templates/template-hortikultura-5-1-1.xlsx",
  },
  {
    id: "horticulture512",
    label: "Tabel 5.1.2",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!M3:V26",
    description: "Produksi tanaman sayuran",
    templatePath: "/templates/template-hortikultura-5-1-2.xlsx",
  },
  {
    id: "horticulture515",
    label: "Tabel 5.1.5",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!W3:AD26",
    description: "Luas panen tanaman biofarmaka",
    templatePath: "/templates/template-hortikultura-5-1-5.xlsx",
  },
  {
    id: "horticulture516",
    label: "Tabel 5.1.6",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AE3:AL26",
    description: "Produksi tanaman biofarmaka",
    templatePath: "/templates/template-hortikultura-5-1-6.xlsx",
  },
  {
    id: "horticulture519",
    label: "Tabel 5.1.9",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AM3:AT26",
    description: "Luas panen tanaman hias",
    templatePath: "/templates/template-hortikultura-5-1-9.xlsx",
  },
  {
    id: "horticulture5110",
    label: "Tabel 5.1.10",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!AU3:BB26",
    description: "Produksi tanaman hias",
    templatePath: "/templates/template-hortikultura-5-1-10.xlsx",
  },
  {
    id: "horticulture5113",
    label: "Tabel 5.1.13",
    group: "Survei Hortikultura",
    target: "DATABASE HORTI!BC3:BL26",
    description: "Produksi buah-buahan",
    templatePath: "/templates/template-hortikultura-5-1-13.xlsx",
  },
];

export function isDatasetId(value: string): value is DatasetId {
  return DATASET_IDS.includes(value as DatasetId);
}
