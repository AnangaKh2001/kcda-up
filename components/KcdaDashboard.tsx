"use client";

import { useState } from "react";

type Screen = "overview" | "data" | "publication";
type DataKind = "PODES" | "Data Kecamatan" | "Survei Hortikultura" | "EMIS";
type PublicationForm = {
  kecamatan: string; year: string; catalog: string; issn: string; publication: string;
  director: string; responsible: string; editor: string; dataProcessor: string; layout: string; translator: string;
};

const dataCards: { kind: DataKind; description: string; color: string }[] = [
  { kind: "PODES", description: "Potensi Desa", color: "blue" },
  { kind: "Data Kecamatan", description: "Administrasi kecamatan", color: "orange" },
  { kind: "Survei Hortikultura", description: "Komoditas hortikultura", color: "green" },
  { kind: "EMIS", description: "Data pendidikan keagamaan", color: "purple" }
];

const YEARS = Array.from({ length: 11 }, (_, index) => String(new Date().getFullYear() + index));

const KECAMATAN = [
  "METRO KIBANG", "BATANGHARI", "SEKAMPUNG", "MARGATIGA", "SEKAMPUNG UDIK", "JABUNG",
  "PASIR SAKTI", "WAWAY KARYA", "MARGA SEKAMPUNG", "LABUHAN MARINGGAI", "MATARAM BARU",
  "BANDAR SRIBHAWONO", "MELINTING", "GUNUNG PELINDUNG", "WAY JEPARA", "BRAJA SLEBAH",
  "LABUHAN RATU", "SUKADANA", "BUMI AGUNG", "BATANGHARI NUBAN", "PEKALONGAN", "RAMAN UTARA",
  "PURBOLINGGO", "WAY BUNGUR"
] as const;

export default function KcdaDashboard({ username }: { username: string }) {
  const [screen, setScreen] = useState<Screen>("overview");
  const [uploaded, setUploaded] = useState<DataKind[]>([]);
  const [completedKcda, setCompletedKcda] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [publicationError, setPublicationError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [form, setForm] = useState<PublicationForm>({ kecamatan: "", year: YEARS[0], catalog: "", issn: "", publication: "", director: "", responsible: "", editor: "", dataProcessor: "", layout: "", translator: "" });
  const complete = uploaded.length === dataCards.length;
  const selectScreen = (value: Screen) => { setScreen(value); setNotice(""); };
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const mockUpload = (kind: DataKind) => setUploaded((current) => current.includes(kind) ? current : [...current, kind]);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };
  const publish = async () => {
    setNotice("");
    setPublicationError("");
    setIsPublishing(true);
    try {
      const response = await fetch("/api/publications/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Gagal memperbarui Google Sheet");
      const publicationKey = `${form.kecamatan}-${form.year}`;
      setCompletedKcda((current) => current.includes(publicationKey) ? current : [...current, publicationKey]);
      setNotice("Data identitas publikasi berhasil diperbarui di Google Sheet.");
    } catch (error) {
      setPublicationError(error instanceof Error ? error.message : "Gagal memperbarui Google Sheet");
    } finally {
      setIsPublishing(false);
    }
  };

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">K</span><span>KCDA <b>Up!</b></span></div><p className="workspace">WORKSPACE PUBLIKASI</p><nav><button className={screen === "overview" ? "active" : ""} onClick={() => selectScreen("overview")}><i>⌂</i> Ringkasan</button><button className={screen === "data" ? "active" : ""} onClick={() => selectScreen("data")}><i>▣</i> Data sumber</button><button className={screen === "publication" ? "active" : ""} onClick={() => selectScreen("publication")}><i>✦</i> Buat KCDA</button></nav><div className="sidebar-help"><span>?</span><div><b>Butuh bantuan?</b><small>Petunjuk penggunaan KCDA Up!</small></div></div><button className="logout" onClick={logout}>Keluar</button></aside><main className="content"><header><button className="mobile-brand" onClick={() => selectScreen("overview")}><span className="brand-mark">K</span> KCDA Up!</button><div><p className="eyebrow">{screen === "publication" ? "PUBLIKASI BARU" : screen === "data" ? "PERSIAPAN DATA" : "DASBOR"}</p><h1>{screen === "overview" ? "Selamat datang, Admin." : screen === "data" ? "Data sumber publikasi" : "Buat publikasi KCDA"}</h1></div><div className="profile"><span>{username.slice(0, 1).toUpperCase()}</span><div><b>{username}</b><small>Administrator</small></div></div></header>{screen === "overview" && <Overview uploaded={uploaded.length} complete={complete} completedKcda={completedKcda.length} go={selectScreen} />}{screen === "data" && <DataScreen uploaded={uploaded} upload={mockUpload} complete={complete} />}{screen === "publication" && <PublicationScreen form={form} setField={setField} ready={complete} notice={notice} error={publicationError} isPublishing={isPublishing} publish={publish} />}</main></div>;
}

function Overview({ uploaded, complete, completedKcda, go }: { uploaded: number; complete: boolean; completedKcda: number; go: (value: Screen) => void }) { return <><section className="hero"><div><span className="hero-chip">SIAP MEMULAI</span><h2>Wujudkan KCDA yang akurat, konsisten, dan siap terbit.</h2><p>Kelola data sumber dan metadata publikasi dalam satu alur kerja yang sederhana.</p><button className="primary" onClick={() => go(complete ? "publication" : "data")}>{complete ? "Buat publikasi" : "Siapkan data"} <b>→</b></button></div><div className="hero-art"><div className="sheet-mini"><p>KCDA <b>{YEARS[0]}</b></p><span /><span /><span /><span /></div><i className="orb-one" /><i className="orb-two" /></div></section><section className="stats"><article><span className="icon blue">▣</span><div><p>Data terunggah</p><strong>{uploaded} <small>/ 4 sumber</small></strong></div></article><article><span className="icon green">✓</span><div><p>Status persiapan</p><strong>{complete ? "Lengkap" : "Belum lengkap"}</strong></div></article><article><span className="icon orange">✦</span><div><p>KCDA kecamatan selesai</p><strong>{completedKcda} <small>/ {KECAMATAN.length} kecamatan</small></strong></div></article></section><section className="section-heading"><div><p className="eyebrow">ALUR KERJA</p><h2>Tiga langkah menuju publikasi</h2></div></section><section className="steps"><article><span>01</span><div className="step-icon blue">⇧</div><h3>Unggah data sumber</h3><p>Tambahkan PODES, data kecamatan, dan sumber pendukung lainnya.</p><button onClick={() => go("data")}>Kelola data →</button></article><article><span>02</span><div className="step-icon orange">⌁</div><h3>Perbarui database</h3><p>Validasi dan olah data untuk digunakan pada publikasi.</p><em>Segera hadir</em></article><article><span>03</span><div className="step-icon green">✦</div><h3>Buat publikasi</h3><p>Lengkapi metadata dan tim penyusun untuk menghasilkan KCDA.</p><button onClick={() => go("publication")}>Mulai membuat →</button></article></section></> }

function DataScreen({ uploaded, upload, complete }: { uploaded: DataKind[]; upload: (value: DataKind) => void; complete: boolean }) { return <><section className="intro"><div><h2>Siapkan data untuk KCDA</h2><p>Unggah seluruh sumber data sesuai tahun publikasi. Fitur penyimpanan dan pemrosesan data akan dihubungkan pada tahap backend berikutnya.</p></div><span className={`status ${complete ? "done" : "waiting"}`}>{complete ? "✓ Semua data siap" : `${uploaded.length} dari 4 data siap`}</span></section><section className="year-filter"><label>Tahun data<select defaultValue={YEARS[0]}>{YEARS.map((year) => <option key={year}>{year}</option>)}</select></label><p>Format yang akan didukung: XLSX dan CSV</p></section><section className="data-grid">{dataCards.map((item) => { const done = uploaded.includes(item.kind); return <article key={item.kind} className="data-card"><div className={`icon ${item.color}`}>▤</div><div className="data-card-top"><div><h3>{item.kind}</h3><p>{item.description}</p></div><span className={done ? "tag ready" : "tag"}>{done ? "Siap" : "Belum ada"}</span></div><div className="dropzone"><span>⇧</span><p>{done ? "Berkas contoh berhasil dipilih" : "Seret file ke sini atau pilih dari perangkat"}</p><button onClick={() => upload(item.kind)}>{done ? "Ganti berkas" : "Pilih berkas"}</button></div><small>{done ? "Menunggu proses update database" : "Belum ada file terunggah"}</small></article>; })}</section><section className="next-callout"><div><span className="icon blue">i</span><p><b>Update database</b><br />Akan tersedia setelah layanan penyimpanan data diimplementasikan.</p></div><button disabled={!complete}>Update database <b>→</b></button></section></> }

function PublicationScreen({ form, setField, ready, notice, error, isPublishing, publish }: { form: PublicationForm; setField: (field: keyof PublicationForm, value: string) => void; ready: boolean; notice: string; error: string; isPublishing: boolean; publish: () => Promise<void> }) { const field = (key: keyof PublicationForm, label: string, placeholder: string, required = false) => <label>{label}{required && <b className="required">*</b>}<input required={required} value={form[key]} onChange={(event) => setField(key, event.target.value)} placeholder={placeholder} /></label>; return <form className="publication-form" onSubmit={(event) => { event.preventDefault(); void publish(); }}><section><div className="form-heading"><span>01</span><div><h3>Identitas publikasi</h3><p>Informasi utama Kecamatan Dalam Angka yang akan diterbitkan.</p></div></div><div className="form-grid"><label>Kecamatan<b className="required">*</b><select required value={form.kecamatan} onChange={(event) => setField("kecamatan", event.target.value)}><option value="" disabled>Pilih kecamatan</option>{KECAMATAN.map((kecamatan) => <option key={kecamatan}>{kecamatan}</option>)}</select></label><label>Tahun<b className="required">*</b><select value={form.year} onChange={(event) => setField("year", event.target.value)}>{YEARS.map((year) => <option key={year}>{year}</option>)}</select></label>{field("catalog", "Nomor katalog", "Contoh: 1102001.1804.010", true)}{field("issn", "ISSN", "Contoh: 1234-5678", true)}{field("publication", "Nomor publikasi", "Contoh: 18040.2601", true)}</div></section><section><div className="form-heading"><span>02</span><div><h3>Tim penyusun</h3><p>Nama yang akan dicantumkan pada halaman kredensial publikasi.</p></div></div><div className="form-grid">{field("director", "Pengarah", "Nama pengarah")} {field("responsible", "Penanggung jawab", "Nama penanggung jawab")} {field("editor", "Penyunting", "Nama penyunting")} {field("dataProcessor", "Pengolah data dan penulis naskah", "Nama pengolah data / penulis")} {field("layout", "Penata letak", "Nama penata letak")} {field("translator", "Penerjemah", "Nama penerjemah")}</div></section><div className="form-actions"><p>Pastikan seluruh informasi telah benar sebelum membuat publikasi.</p><button className="primary" disabled={!ready || isPublishing}>{isPublishing ? "Memperbarui Sheet..." : ready ? "Buat publikasi" : "Lengkapi data sumber terlebih dahulu"} <b>→</b></button></div>{notice && <div className="success-message">✓ {notice}</div>}{error && <div className="error">{error}</div>}</form> }
