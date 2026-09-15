"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DATASETS, DatasetId } from "@/lib/data-source-types";

type Screen = "overview" | "data" | "publication";
type SourceUpload = {
  file: File;
  status: "validating" | "valid" | "invalid";
  errors: string[];
  rows?: number;
};
type PublicationForm = {
  kecamatan: string;
  year: string;
  catalog: string;
  issn: string;
  publication: string;
  director: string;
  responsible: string;
  editor: string;
  dataProcessor: string;
  layout: string;
  translator: string;
};
type PublicationResult = {
  status?: "progress" | "success" | "error";
  progress?: number;
  log?: string;
  error?: string;
  documentUrl?: string;
};
type MetadataResult = {
  ok?: boolean;
  error?: string;
  metadata?: Partial<PublicationForm>;
};

const YEARS = Array.from({ length: 11 }, (_, index) =>
  String(new Date().getFullYear() + index),
);
const KECAMATAN = [
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
] as const;

const SCREEN_ROUTES: Record<Screen, string> = {
  overview: "/dashboard",
  data: "/data-sumber",
  publication: "/publikasi",
};

export default function KcdaDashboard({
  username,
  initialScreen = "overview",
}: {
  username: string;
  initialScreen?: Screen;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [sourceUploads, setSourceUploads] = useState<
    Partial<Record<DatasetId, SourceUpload>>
  >({});
  const [databaseUpdated, setDatabaseUpdated] = useState(false);
  const [completedKcda, setCompletedKcda] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [publicationError, setPublicationError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publicationProgress, setPublicationProgress] = useState(0);
  const [publicationLogs, setPublicationLogs] = useState<string[]>([]);
  const [documentUrl, setDocumentUrl] = useState("");
  const [form, setForm] = useState<PublicationForm>({
    kecamatan: "",
    year: YEARS[0],
    catalog: "",
    issn: "",
    publication: "",
    director: "",
    responsible: "",
    editor: "",
    dataProcessor: "",
    layout: "",
    translator: "",
  });
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const validUploads = Object.values(sourceUploads).filter(
    (item) => item?.status === "valid",
  ).length;
  const selectScreen = (value: Screen) => {
    setScreen(value);
    setNotice("");
    setPublicationError("");
    router.push(SCREEN_ROUTES[value]);
  };
  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  const runPublication = async (
    payload: PublicationForm,
    openResult = false,
  ) => {
    const resultWindow = openResult
      ? window.open("about:blank", "_blank")
      : null;
    setNotice("");
    setPublicationError("");
    setDocumentUrl("");
    setPublicationProgress(2);
    setPublicationLogs([]);
    setIsPublishing(true);
    try {
      const response = await fetch("/api/publications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.body)
        throw new Error("Server tidak mengirim progres publikasi.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resultUrl = "";
      const handleEvent = (event: PublicationResult) => {
        if (typeof event.progress === "number")
          setPublicationProgress(event.progress);
        if (event.log)
          setPublicationLogs((current) => [...current, event.log!]);
        if (event.status === "error" || event.error)
          throw new Error(event.error || "Gagal membuat publikasi");
        if (event.status === "success") resultUrl = event.documentUrl || "";
      };
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines.filter(Boolean))
          handleEvent(JSON.parse(line) as PublicationResult);
        if (done) break;
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as PublicationResult);
      if (!response.ok || !resultUrl)
        throw new Error("Publikasi tidak menghasilkan dokumen.");
      const publicationKey = `${payload.kecamatan}-${payload.year}`;
      setCompletedKcda((current) =>
        current.includes(publicationKey)
          ? current
          : [...current, publicationKey],
      );
      setDocumentUrl(resultUrl);
      if (resultWindow) {
        resultWindow.opener = null;
        resultWindow.location.href = resultUrl;
      }
      setNotice("Publikasi berhasil dibuat dan tabel dinamis sudah diisi.");
    } catch (error) {
      resultWindow?.close();
      setPublicationError(
        error instanceof Error ? error.message : "Gagal membuat publikasi",
      );
    } finally {
      setIsPublishing(false);
    }
  };
  const publish = async () => runPublication(form, true);

  const loadPublicationMetadata = async () => {
    setIsLoadingMetadata(true);
    setPublicationError("");
    try {
      const response = await fetch("/api/publications/create");
      const result = (await response.json()) as MetadataResult;
      if (!response.ok || !result.ok || !result.metadata)
        throw new Error(result.error || "Gagal membaca data master");
      setForm((current) => ({ ...current, ...result.metadata }));
    } catch (error) {
      setPublicationError(
        error instanceof Error ? error.message : "Gagal membaca data master",
      );
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  useEffect(() => {
    if (screen !== "publication" || metadataLoaded) return;
    setMetadataLoaded(true);
    void loadPublicationMetadata();
    // Metadata cukup dimuat sekali saat layar publikasi pertama kali dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, metadataLoaded]);

  useEffect(() => {
    setDatabaseUpdated(
      localStorage.getItem("kcda-database-updated") === "true",
    );
  }, []);

  useEffect(() => {
    setScreen(initialScreen);
  }, [initialScreen]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span>
            KCDA <b>Up!</b>
          </span>
        </div>
        <p className="workspace">WORKSPACE PUBLIKASI</p>
        <nav>
          <button
            className={screen === "overview" ? "active" : ""}
            onClick={() => selectScreen("overview")}
          >
            <i>⌂</i> Ringkasan
          </button>
          <button
            className={screen === "data" ? "active" : ""}
            onClick={() => selectScreen("data")}
          >
            <i>▣</i> Data sumber
          </button>
          <button
            className={screen === "publication" ? "active" : ""}
            onClick={() => selectScreen("publication")}
          >
            <i>✦</i> Buat KCDA
          </button>
        </nav>
        <div className="sidebar-help">
          <span>?</span>
          <div>
            <b>Butuh bantuan?</b>
            <small>Petunjuk penggunaan KCDA Up!</small>
          </div>
        </div>
        <button className="logout" onClick={logout}>
          Keluar
        </button>
      </aside>
      <main className="content">
        <header>
          <button
            className="mobile-brand"
            onClick={() => selectScreen("overview")}
          >
            <span className="brand-mark">K</span> KCDA Up!
          </button>
          <div>
            <p className="eyebrow">
              {screen === "publication"
                ? "PUBLIKASI BARU"
                : screen === "data"
                  ? "PERSIAPAN DATA"
                  : "DASBOR"}
            </p>
            <h1>
              {screen === "overview"
                ? "Selamat datang, Admin."
                : screen === "data"
                  ? "Data sumber publikasi"
                  : "Buat publikasi KCDA"}
            </h1>
          </div>
          <div className="profile">
            <span>{username.slice(0, 1).toUpperCase()}</span>
            <div>
              <b>{username}</b>
              <small>Administrator</small>
            </div>
          </div>
        </header>
        {screen === "overview" && (
          <Overview
            uploaded={validUploads}
            complete={databaseUpdated}
            completedKcda={completedKcda.length}
            go={selectScreen}
          />
        )}
        {screen === "data" && (
          <DataScreen
            uploads={sourceUploads}
            setUploads={setSourceUploads}
            onUpdated={() => {
              localStorage.setItem("kcda-database-updated", "true");
              setDatabaseUpdated(true);
            }}
          />
        )}
        {screen === "publication" && (
          <PublicationScreen
            form={form}
            setField={setField}
            notice={notice}
            error={publicationError}
            isPublishing={isPublishing}
            progress={publicationProgress}
            logs={publicationLogs}
            documentUrl={documentUrl}
            publish={publish}
            isLoadingMetadata={isLoadingMetadata}
            refreshMetadata={loadPublicationMetadata}
          />
        )}
      </main>
    </div>
  );
}

function Overview({
  uploaded,
  complete,
  completedKcda,
  go,
}: {
  uploaded: number;
  complete: boolean;
  completedKcda: number;
  go: (value: Screen) => void;
}) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="hero-chip">SIAP MEMULAI</span>
          <h2>Wujudkan KCDA yang akurat, konsisten, dan siap terbit.</h2>
          <p>
            Kelola data sumber dan metadata publikasi dalam satu alur kerja yang
            sederhana.
          </p>
          <button
            className="primary"
            onClick={() => go(complete ? "publication" : "data")}
          >
            {complete ? "Buat publikasi" : "Siapkan data"} <b>→</b>
          </button>
        </div>
        <div className="hero-art">
          <div className="sheet-mini">
            <p>
              KCDA <b>{YEARS[0]}</b>
            </p>
            <span />
            <span />
            <span />
            <span />
          </div>
          <i className="orb-one" />
          <i className="orb-two" />
        </div>
      </section>
      <section className="stats">
        <article>
          <span className="icon blue">▣</span>
          <div>
            <p>Data terunggah</p>
            <strong>
              {uploaded} <small>/ {DATASETS.length} file terpetakan</small>
            </strong>
          </div>
        </article>
        <article>
          <span className="icon green">✓</span>
          <div>
            <p>Status persiapan</p>
            <strong>{complete ? "Lengkap" : "Belum lengkap"}</strong>
          </div>
        </article>
        <article>
          <span className="icon orange">✦</span>
          <div>
            <p>KCDA kecamatan selesai</p>
            <strong>
              {completedKcda} <small>/ {KECAMATAN.length} kecamatan</small>
            </strong>
          </div>
        </article>
      </section>
      <section className="section-heading">
        <div>
          <p className="eyebrow">ALUR KERJA</p>
          <h2>Tiga langkah menuju publikasi</h2>
        </div>
      </section>
      <section className="steps">
        <article>
          <span>01</span>
          <div className="step-icon blue">⇧</div>
          <h3>Unggah data sumber</h3>
          <p>Tambahkan PODES, data kecamatan, dan sumber pendukung lainnya.</p>
          <button onClick={() => go("data")}>Kelola data →</button>
        </article>
        <article>
          <span>02</span>
          <div className="step-icon orange">⌁</div>
          <h3>Perbarui database</h3>
          <p>Validasi dan olah data untuk digunakan pada publikasi.</p>
          <button onClick={() => go("data")}>Update database →</button>
        </article>
        <article>
          <span>03</span>
          <div className="step-icon green">✦</div>
          <h3>Buat publikasi</h3>
          <p>Lengkapi metadata dan tim penyusun untuk menghasilkan KCDA.</p>
          <button onClick={() => go("publication")}>Mulai membuat →</button>
        </article>
      </section>
    </>
  );
}

function DataScreen({
  uploads,
  setUploads,
  onUpdated,
}: {
  uploads: Partial<Record<DatasetId, SourceUpload>>;
  setUploads: (
    updater: (
      current: Partial<Record<DatasetId, SourceUpload>>,
    ) => Partial<Record<DatasetId, SourceUpload>>,
  ) => void;
  onUpdated: () => void;
}) {
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const validEntries = DATASETS.filter(
    (item) => uploads[item.id]?.status === "valid",
  );

  const selectFile = async (dataset: DatasetId, file?: File) => {
    if (!file) return;
    setUpdateError("");
    setUpdateSuccess("");
    setUploads((current) => ({
      ...current,
      [dataset]: { file, status: "validating", errors: [] },
    }));
    const data = new FormData();
    data.append("dataset", dataset);
    data.append("file", file);
    try {
      const response = await fetch("/api/data-sources/validate", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        valid?: boolean;
        errors?: string[];
        rows?: number;
        error?: string;
      };
      const errors = result.errors?.length
        ? result.errors
        : [result.error || "Struktur file tidak sesuai template."];
      setUploads((current) => ({
        ...current,
        [dataset]: {
          file,
          status: result.valid ? "valid" : "invalid",
          errors: result.valid ? [] : errors,
          rows: result.rows,
        },
      }));
      if (!response.ok || !result.valid) setErrorDetails(errors);
    } catch (error) {
      const errors = [
        error instanceof Error ? error.message : "File gagal divalidasi.",
      ];
      setUploads((current) => ({
        ...current,
        [dataset]: { file, status: "invalid", errors },
      }));
      setErrorDetails(errors);
    }
  };

  const runUpdate = async () => {
    setConfirmOpen(false);
    setIsUpdating(true);
    setProgress(2);
    setLogs([]);
    setUpdateError("");
    setUpdateSuccess("");
    const data = new FormData();
    data.append("confirmation", confirmation);
    validEntries.forEach((item) => {
      const file = uploads[item.id]?.file;
      if (file) data.append(item.id, file);
    });
    try {
      const response = await fetch("/api/data-sources/update", {
        method: "POST",
        body: data,
      });
      if (!response.body)
        throw new Error("Server tidak mengirimkan progres update.");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as {
            status: string;
            progress?: number;
            log?: string;
            error?: string;
          };
          if (typeof event.progress === "number") setProgress(event.progress);
          if (event.log) setLogs((current) => [...current, event.log!]);
          if (event.status === "error")
            throw new Error(event.error || "Update database gagal.");
          if (event.status === "success") {
            setUpdateSuccess("Database berhasil diperbarui dan diverifikasi.");
            onUpdated();
          }
        }
        if (done) break;
      }
    } catch (error) {
      setUpdateError(
        error instanceof Error ? error.message : "Update database gagal.",
      );
    } finally {
      setIsUpdating(false);
      setConfirmation("");
    }
  };

  const statusLabel = (upload?: SourceUpload) =>
    !upload
      ? "Belum ada"
      : upload.status === "validating"
        ? "Memeriksa..."
        : upload.status === "valid"
          ? "Valid"
          : "Tidak valid";
  return (
    <>
      <section className="intro">
        <div>
          <h2>Siapkan data untuk KCDA</h2>
          <p>
            Unggah satu atau beberapa template. Hanya file yang valid dan
            dipilih yang akan memperbarui database.
          </p>
        </div>
        <span className={`status ${validEntries.length ? "done" : "waiting"}`}>
          {validEntries.length
            ? `${validEntries.length} file valid`
            : "Belum ada file valid"}
        </span>
      </section>
      <section className="year-filter">
        <label>
          Tahun data
          <select defaultValue={YEARS[0]}>
            {YEARS.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <p>Format wajib: XLSX sesuai template</p>
      </section>
      <section className="source-groups">
        {(["Data Kecamatan", "Survei Hortikultura", "EMIS"] as const).map(
          (group) => (
            <article
              className={`source-group ${group === "EMIS" ? "emis-source" : ""}`}
              key={group}
            >
              <div className="source-group-heading">
                <div
                  className={`icon ${group === "EMIS" ? "purple" : group === "Survei Hortikultura" ? "green" : "orange"}`}
                >
                  ▤
                </div>
                <div>
                  <h3>{group}</h3>
                  <p>
                    {group === "EMIS"
                      ? "Data pendidikan keagamaan tahun berjalan dan sebelumnya"
                      : group === "Survei Hortikultura"
                        ? "Tujuh tabel tanaman sayuran, biofarmaka, hias, dan buah"
                        : "Data administrasi, penduduk, wilayah, dan aparatur"}
                  </p>
                </div>
              </div>
              <div className="upload-list">
                {DATASETS.filter((item) => item.group === group).map((item) => {
                  const upload = uploads[item.id];
                  return (
                    <div
                      className={`upload-row ${upload?.status || ""}`}
                      key={item.id}
                    >
                      <div>
                        <b>{item.label}</b>
                        <small>{upload?.file.name || item.description}</small>
                        {upload?.status === "invalid" && (
                          <button
                            type="button"
                            className="error-detail"
                            onClick={() => setErrorDetails(upload.errors)}
                          >
                            Lihat kesalahan
                          </button>
                        )}
                      </div>
                      <span
                        className={`tag ${upload?.status === "valid" ? "ready" : upload?.status === "invalid" ? "invalid" : ""}`}
                      >
                        {statusLabel(upload)}
                      </span>
                      <label className="file-button">
                        {upload ? "Ganti" : "Pilih file"}
                        <input
                          type="file"
                          accept=".xlsx"
                          disabled={
                            isUpdating || upload?.status === "validating"
                          }
                          onChange={(event) => {
                            void selectFile(item.id, event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </article>
          ),
        )}
        <article className="source-group podes-source">
          <div className="source-group-heading">
            <div className="icon blue">▤</div>
            <div>
              <h3>PODES</h3>
              <p>Data Potensi Desa</p>
            </div>
          </div>
          <div className="upload-list">
            <div className="upload-row">
              <div>
                <b>File PODES</b>
                <small>Pilih file Excel dari perangkat</small>
              </div>
              <span className="tag">Belum ada</span>
              <button className="file-button" type="button" disabled>
                Pilih file
              </button>
            </div>
          </div>
        </article>
      </section>
      <section className="next-callout">
        <div>
          <span className="icon blue">i</span>
          <p>
            <b>Update database</b>
            <br />
            {validEntries.length
              ? `${validEntries.length} file valid siap diperbarui.`
              : "Pilih minimal satu file yang sesuai template."}
          </p>
        </div>
        <button
          disabled={!validEntries.length || isUpdating}
          onClick={() => setConfirmOpen(true)}
        >
          Update database <b>→</b>
        </button>
      </section>
      {(isUpdating || logs.length > 0) && (
        <section className="process-panel data-process">
          <div className="process-top">
            <div>
              <p className="eyebrow">UPDATE DATABASE</p>
              <h3>
                {isUpdating
                  ? "Sedang memperbarui master sheet"
                  : updateSuccess
                    ? "Update selesai"
                    : "Proses dihentikan"}
              </h3>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol>
            {logs.map((log, index) => (
              <li
                key={`${log}-${index}`}
                className={
                  isUpdating && index === logs.length - 1 ? "current" : ""
                }
              >
                {log}
              </li>
            ))}
          </ol>
        </section>
      )}
      {updateSuccess && (
        <div className="success-message">✓ {updateSuccess}</div>
      )}
      {updateError && <div className="error">{updateError}</div>}
      {errorDetails.length > 0 && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="validation-title"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">FILE TIDAK SESUAI</p>
                <h3 id="validation-title">Validasi template gagal</h3>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setErrorDetails([])}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <p>Perbaiki bagian berikut lalu unggah ulang file.</p>
            <ol className="validation-errors">
              {errorDetails.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ol>
            <div className="dialog-actions">
              <button
                type="button"
                className="primary"
                onClick={() => setErrorDetails([])}
              >
                Mengerti
              </button>
            </div>
          </section>
        </div>
      )}
      {confirmOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="dialog confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">KONFIRMASI UPDATE</p>
                <h3 id="confirm-title">Data yang akan diperbarui</h3>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setConfirmOpen(false)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="update-summary">
              {validEntries.map((item) => (
                <div key={item.id}>
                  <b>{item.label}</b>
                  <span>{uploads[item.id]?.file.name}</span>
                  <small>{item.target}</small>
                </div>
              ))}
            </div>
            <label className="confirmation-field">
              Ketik <b>YAKIN UPDATE</b> untuk melanjutkan
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="YAKIN UPDATE"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="primary"
                disabled={confirmation !== "YAKIN UPDATE"}
                onClick={() => void runUpdate()}
              >
                Konfirmasi update
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function PublicationScreen({
  form,
  setField,
  notice,
  error,
  isPublishing,
  progress,
  logs,
  documentUrl,
  publish,
  isLoadingMetadata,
  refreshMetadata,
}: {
  form: PublicationForm;
  setField: (field: keyof PublicationForm, value: string) => void;
  notice: string;
  error: string;
  isPublishing: boolean;
  progress: number;
  logs: string[];
  documentUrl: string;
  publish: () => Promise<void>;
  isLoadingMetadata: boolean;
  refreshMetadata: () => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const field = (
    key: keyof PublicationForm,
    label: string,
    placeholder: string,
    required = false,
    multiline = false,
  ) => (
    <label>
      {label}
      {required && <b className="required">*</b>}
      {multiline ? (
        <textarea
          rows={3}
          value={form[key]}
          onChange={(event) => setField(key, event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          required={required}
          value={form[key]}
          onChange={(event) => setField(key, event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
  return (
    <form
      className="publication-form"
      onSubmit={(event) => {
        event.preventDefault();
        setConfirmation("");
        setConfirmOpen(true);
      }}
    >
      <section>
        <div className="form-heading">
          <span>01</span>
          <div>
            <h3>Identitas publikasi</h3>
            <p>Informasi utama Kecamatan Dalam Angka yang akan diterbitkan.</p>
          </div>
          <button
            type="button"
            className="refresh-metadata"
            disabled={isLoadingMetadata || isPublishing}
            onClick={() => void refreshMetadata()}
            title="Ambil ulang data dari master sheet"
          >
            <b aria-hidden="true">↻</b>
            {isLoadingMetadata ? "Memuat..." : "Refresh data"}
          </button>
        </div>
        {isLoadingMetadata ? (
          <MetadataSkeleton count={5} />
        ) : (
          <div className="form-grid">
            <label>
              Kecamatan<b className="required">*</b>
              <select
                required
                value={form.kecamatan}
                onChange={(event) => setField("kecamatan", event.target.value)}
              >
                <option value="" disabled>
                  Pilih kecamatan
                </option>
                {KECAMATAN.map((kecamatan) => (
                  <option key={kecamatan}>{kecamatan}</option>
                ))}
              </select>
            </label>
            <label>
              Tahun<b className="required">*</b>
              <select
                value={form.year}
                onChange={(event) => setField("year", event.target.value)}
              >
                {YEARS.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
            {field(
              "catalog",
              "Nomor katalog",
              "Contoh: 1102001.1804.010",
              true,
            )}
            {field("issn", "ISSN", "Contoh: 1234-5678", true)}
            {field(
              "publication",
              "Nomor publikasi",
              "Contoh: 18040.2601",
              true,
            )}
          </div>
        )}
      </section>
      <section>
        <div className="form-heading">
          <span>02</span>
          <div>
            <h3>Tim penyusun</h3>
            <p>Nama yang akan dicantumkan pada halaman kredensial publikasi.</p>
          </div>
        </div>
        {isLoadingMetadata ? (
          <MetadataSkeleton count={6} />
        ) : (
          <div className="form-grid">
            {field("director", "Pengarah / Director", "Nama pengarah")}{" "}
            {field(
              "responsible",
              "Penanggung Jawab / Persons in Charge",
              "Nama penanggung jawab",
            )}{" "}
            {field("editor", "Penyunting / Editors", "Nama penyunting")}{" "}
            {field(
              "dataProcessor",
              "Pengolah Data dan Penulis Naskah / Data Processor and Writers",
              "Satu nama per baris",
              false,
              true,
            )}{" "}
            {field("layout", "Penata Letak / Layouters", "Nama penata letak")}{" "}
            {field("translator", "Penerjemah / Translators", "Nama penerjemah")}
          </div>
        )}
      </section>
      <div className="form-actions">
        <p>
          Nilai awal diambil dari master sheet. Perubahan akan disimpan kembali
          saat publikasi dibuat.
        </p>
        <div className="action-buttons">
          <button className="primary" disabled={isPublishing}>
            {isPublishing ? "Membuat publikasi..." : "Buat publikasi"} <b>→</b>
          </button>
        </div>
      </div>
      {(isPublishing || logs.length > 0 || documentUrl) && (
        <section className="process-panel">
          <div className="process-top">
            <div>
              <p className="eyebrow">PROSES PUBLIKASI</p>
              <h3>
                {isPublishing
                  ? "Sedang membuat dokumen"
                  : documentUrl
                    ? "Dokumen selesai dibuat"
                    : "Proses publikasi"}
              </h3>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol>
            {logs.map((log, index) => (
              <li
                key={`${log}-${index}`}
                className={
                  index === logs.length - 1 && isPublishing ? "current" : ""
                }
              >
                {log}
              </li>
            ))}
          </ol>
          {documentUrl && (
            <a
              className="doc-link"
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Buka Google Docs hasil publikasi →
            </a>
          )}
        </section>
      )}
      {notice && <div className="success-message">✓ {notice}</div>}
      {error && <div className="error">{error}</div>}
      {confirmOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="dialog confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publication-confirm-title"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">KONFIRMASI PUBLIKASI</p>
                <h3 id="publication-confirm-title">Buat dokumen KCDA?</h3>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setConfirmOpen(false)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="publication-confirm-summary">
              <div>
                <span>Kecamatan</span>
                <b>{form.kecamatan}</b>
              </div>
              <div>
                <span>Tahun</span>
                <b>{form.year}</b>
              </div>
              <div>
                <span>Nomor publikasi</span>
                <b>{form.publication}</b>
              </div>
            </div>
            <p>
              Identitas dan tim penyusun akan diperbarui di master sheet,
              kemudian dokumen output serta tabel dinamis akan dibuat.
            </p>
            <label className="confirmation-field">
              Ketik <b>YAKIN BUAT PUBLIKASI</b> untuk melanjutkan
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="YAKIN BUAT PUBLIKASI"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="primary"
                disabled={confirmation !== "YAKIN BUAT PUBLIKASI"}
                onClick={() => {
                  setConfirmOpen(false);
                  void publish();
                }}
              >
                Buat publikasi
              </button>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}

function MetadataSkeleton({ count }: { count: number }) {
  return (
    <div
      className="form-grid metadata-skeleton"
      aria-label="Memuat data master"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-field" key={index}>
          <span />
          <i />
        </div>
      ))}
    </div>
  );
}
