# KCDA Up!

KCDA Up! adalah aplikasi internal untuk membantu penyusunan publikasi **Kecamatan Dalam Angka (KCDA)**. Aplikasi menghubungkan file sumber Excel, master Google Sheets, dan template Google Docs dalam satu alur kerja yang terkontrol.

## Fitur Utama

- Login Google OAuth dengan pembatasan daftar email yang diizinkan.
- Unggah sebagian atau seluruh data sumber tanpa harus menunggu semua file tersedia.
- Validasi struktur workbook, nama sheet, header, tipe data, dan jumlah baris sebelum data ditulis.
- Pembaruan master Google Sheets dengan pencadangan, verifikasi hasil, dan rollback otomatis jika proses gagal.
- Template Excel yang dapat diunduh langsung dari setiap input data.
- Form identitas publikasi dan tim penyusun yang membaca nilai awal dari master sheet.
- Pembuatan salinan Google Docs untuk setiap publikasi.
- Pengisian tabel dinamis berdasarkan jumlah desa, termasuk kasus nama desa yang sama dengan nama kecamatan.
- Progress bar dan log proses untuk update database serta pembuatan publikasi.
- Buku panduan PDF yang dapat dibuka dari sidebar aplikasi.

## Alur Kerja

1. Masuk menggunakan akun Google yang telah diizinkan.
2. Unduh template pada halaman **Data sumber**.
3. Isi template tanpa mengubah struktur, nama sheet, atau header.
4. Unggah satu atau beberapa file dan perbaiki data jika validator menemukan kesalahan.
5. Konfirmasi **Update database** untuk menulis data ke master Google Sheets.
6. Buka **Buat KCDA**, pilih kecamatan, lalu periksa identitas publikasi dan tim penyusun.
7. Konfirmasi pembuatan publikasi dan tunggu proses mencapai 100%.
8. Buka Google Docs hasil yang ditampilkan aplikasi.

## Data Sumber

| Kelompok | Template yang didukung |
| --- | --- |
| Data Kecamatan | Jumlah Penduduk, Penduduk Menurut Umur, Jarak Desa, Jumlah PNS, Jumlah RT/RW |
| Survei Hortikultura | Tabel 5.1.1, 5.1.2, 5.1.5, 5.1.6, 5.1.9, 5.1.10, dan 5.1.13 |
| EMIS | EMIS N dan EMIS N-1 |
| PODES | Slot antarmuka tersedia, tetapi mapping dan proses update belum diaktifkan |

Semua template aktif tersedia di [`public/templates`](public/templates). Validator server dijalankan kembali saat update database agar file yang lolos di antarmuka tetap diperiksa sebelum penulisan.

## Teknologi

- Next.js App Router
- React dan TypeScript
- ExcelJS
- Google OAuth 2.0
- Google Sheets API
- Google Docs API
- Google Drive API

## Menjalankan Secara Lokal

### Prasyarat

- Node.js dan npm
- Project Google Cloud dengan OAuth consent screen
- OAuth Client bertipe **Web application**
- Google Sheets API, Google Docs API, dan Google Drive API aktif
- Service account yang memiliki akses ke master spreadsheet
- Akun Google pengguna yang memiliki akses ke template Docs dan folder output

### Instalasi

```bash
git clone https://github.com/AnangaKh2001/kcda-up.git
cd kcda-up
npm install
```

Salin file contoh environment:

```powershell
Copy-Item .env.example .env
```

Isi `.env` dengan konfigurasi milik environment Anda. Jangan memasukkan nilai rahasia ke `.env.example`, README, atau commit Git.

Jalankan server development:

```bash
npm run dev
```

Aplikasi tersedia di [http://localhost:3000](http://localhost:3000).

## Konfigurasi Environment

| Variabel | Keterangan |
| --- | --- |
| `APP_SECRET` | Secret panjang dan acak untuk mengenkripsi session cookie |
| `APP_USERNAME` | Kompatibilitas login lama; tidak digunakan oleh login Google saat ini |
| `APP_PASSWORD` | Kompatibilitas login lama; tidak digunakan oleh login Google saat ini |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID OAuth Google Web application |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret OAuth Google |
| `GOOGLE_ALLOWED_EMAILS` | Daftar email yang boleh masuk, dipisahkan koma |
| `GOOGLE_OAUTH_REDIRECT_URI` | Referensi kompatibilitas; callback aktif dihitung otomatis dari host request |
| `GOOGLE_SHEET_ID` | ID master Google Sheets |
| `GOOGLE_MASTER_SHEET_NAME` | Nama tab identitas publikasi, biasanya `HALAMAN DEPAN` |
| `GOOGLE_DOC_TEMPLATE_ID` | ID template Google Docs |
| `GOOGLE_USE_EXISTING_DOC` | Gunakan `false` agar setiap publikasi dibuat sebagai salinan baru |
| `GOOGLE_OUTPUT_FOLDER_ID` | ID folder Google Drive untuk dokumen hasil |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account untuk update database |
| `GOOGLE_PRIVATE_KEY` | Private key service account; newline dapat ditulis sebagai `\n` |

Contoh nilai aman tersedia di [`.env.example`](.env.example).

### Redirect URI OAuth

Daftarkan URI berikut pada OAuth Client Google Cloud:

```text
http://localhost:3000/api/auth/google/callback
https://domain-produksi.example/api/auth/google/callback
```

Callback dibentuk otomatis dari host request, termasuk saat berjalan di belakang proxy Vercel.

## Perintah Proyek

```bash
npm run dev        # Menjalankan development server
npm run typecheck  # Memeriksa TypeScript
npm run build      # Membuat production build
npm run start      # Menjalankan production build
```

## Struktur Utama

```text
app/
  api/auth/             OAuth dan session
  api/data-sources/     Validasi dan update master data
  api/publications/     Pembuatan dokumen KCDA
  dashboard/            Halaman ringkasan
  data-sumber/          Unggah dan validasi data
  publikasi/            Form dan proses pembuatan KCDA
components/
  KcdaDashboard.tsx     Antarmuka utama aplikasi
lib/
  auth.ts               Session terenkripsi dan daftar email
  data-source-import.ts Validasi serta mapping workbook
  data-source-types.ts  Definisi dataset dan template
public/
  templates/            Template Excel yang dapat diunduh
  buku-panduan-kcda-up.pdf
```

## Catatan Google Docs

Tabel dinamis diisi melalui Google Docs API menggunakan marker stabil seperti `{{TABLE_1_1}}`. Marker teknis dihapus setelah pengisian selesai.

Google Docs API tidak menyediakan operasi yang setara dengan tombol **Update all linked objects** pada antarmuka Google Docs. Karena seluruh dokumen dapat tetap mengacu ke master sheet yang sama, perubahan master berikutnya dapat memengaruhi linked object jika pengguna memperbaruinya lagi. Selesaikan pembaruan linked object untuk satu kecamatan sebelum master dipindahkan ke kecamatan berikutnya.

## Keamanan

- `.env` diabaikan Git dan tidak boleh di-commit.
- Gunakan nilai dummy pada `.env.example`.
- Batasi `GOOGLE_ALLOWED_EMAILS` hanya untuk pengguna yang berwenang.
- Bagikan file Google hanya kepada akun atau service account yang memerlukan akses.
- Rotasi OAuth client secret, private key, dan `APP_SECRET` jika pernah terekspos.

## Dokumentasi Tambahan

- [Konteks teknis proyek](PROJECT_CONTEXT.md)
- [Buku panduan penggunaan](public/buku-panduan-kcda-up.pdf)
