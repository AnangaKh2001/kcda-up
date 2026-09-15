# KCDA Up! - Project Context

Dokumen ini adalah catatan konteks cepat untuk memahami proyek tanpa perlu eksplorasi ulang dari nol.

## Inti Proyek

KCDA Up! adalah aplikasi untuk mengotomatisasi proses pembuatan dokumen Google Docs publikasi Kecamatan Dalam Angka (KCDA).

Alur besar yang dituju:

1. Admin login ke aplikasi.
2. Admin mengunggah file Excel sumber data dengan template yang sudah ditentukan.
3. Data dari Excel diproses dan dimasukkan ke master data di Google Sheet.
4. Master data menjadi sumber utama pengisian publikasi.
5. Google Docs publikasi KCDA dibuat/diisi dari master data dengan dua mekanisme:
   - Linked object untuk tabel/grafik/range yang cocok dibuat sebagai objek tertaut dari Google Sheet.
   - Google service/API untuk bagian dinamis, terutama konten yang jumlah row-nya berubah-ubah.

## Kondisi Implementasi Saat Ini

Saat catatan ini dibuat, proyek masih berupa aplikasi Next.js tahap awal.

Yang sudah ada:

- Login sederhana berbasis cookie session.
- Dashboard dengan tiga area:
  - Ringkasan.
  - Data sumber.
  - Buat KCDA.
- UI upload data sumber masih mock/local state, belum benar-benar menerima dan memproses file Excel.
- Endpoint `POST /api/publications/create` sudah menulis identitas publikasi ke Google Sheet.
- Penulisan Google Sheet mengisi identitas pada `HALAMAN DEPAN!B1:B5` dan tim penyusun pada sel-sel `HALAMAN INFO` yang dipetakan di bawah.
- Form pembuatan publikasi membaca nilai awal dari master Sheet melalui `GET /api/publications/create`.
- Mapping metadata aktif:
  - `HALAMAN DEPAN!B1:B5`: kecamatan, tahun, katalog, ISSN, nomor publikasi.
  - `HALAMAN INFO!A63`: pengarah.
  - `HALAMAN INFO!A66`: penanggung jawab.
  - `HALAMAN INFO!A69`: penyunting.
  - `HALAMAN INFO!A72`: pengolah data dan penulis naskah.
  - `HALAMAN INFO!A75`: penata letak.
  - `HALAMAN INFO!A78`: penerjemah.
- Saat publikasi dibuat, seluruh metadata tersebut ditulis kembali ke master Sheet. Beberapa nama pada `A72` dimasukkan satu per baris di form dan disimpan dengan pemisah `•`.

## Update Data Sumber

- Update database mendukung unggahan sebagian; tidak semua file harus tersedia.
- File divalidasi ketika dipilih dan divalidasi ulang di server sebelum penulisan.
- Konfirmasi update wajib mengetik `YAKIN UPDATE`.
- Mapping aktif:
  - Jumlah Penduduk -> `DATABASE PENDUDUK WILAYAH!A1:I266`.
  - Umur -> `DATABASE PENDUDUK WILAYAH!S1:V385`.
  - Jarak Desa -> `DATABASE PENDUDUK WILAYAH!AB1:AE265`.
  - PNS pendidikan -> `DATABASE PENDUDUK WILAYAH!AG1:AK241`.
  - PNS desa -> `DATABASE PENDUDUK WILAYAH!AM1:AP265`; pembersihan sampai baris 267 untuk menghapus sisa rumus lama.
  - Jumlah RT/RW -> `DATABASE PENDUDUK WILAYAH!AR1:AU265`.
  - EMIS N -> `DATABASE EMIS!A1:BC27`.
  - EMIS N-1 -> `DATABASE EMIS N-1!A1:BC27`.
- Endpoint:
  - `POST /api/data-sources/validate` untuk validasi langsung satu file.
  - `POST /api/data-sources/update` untuk validasi ulang, pencadangan, update, verifikasi, dan rollback bila gagal.
- Survei Hortikultura sudah aktif untuk tujuh tabel. PODES masih tampil sebagai slot unggahan nonaktif sampai mapping tersedia.

Yang belum ada:

- Penyimpanan file upload atau riwayat upload.
- Pengisian Google Docs via linked object.
- Status/progress job yang persisten.
- Database aplikasi sendiri.

## Struktur File Penting

Route halaman utama:

- `/dashboard` untuk Ringkasan.
- `/data-sumber` untuk unggah, validasi, dan update database.
- `/publikasi` untuk identitas, tim penyusun, dan pembuatan KCDA.

Autentikasi menggunakan Google OAuth web-server flow. Email yang diperbolehkan dibaca dari `GOOGLE_ALLOWED_EMAILS`; token pengguna disimpan dalam cookie terenkripsi dan `HttpOnly`. Callback OAuth dibentuk dari host request saat ini melalui header proxy Vercel, bukan dari environment variable. Daftarkan callback lokal dan production di Google Cloud OAuth Client.

Pembuatan publikasi wajib dikonfirmasi dengan teks `YAKIN BUAT PUBLIKASI`. Endpoint mengirim progres NDJSON berdasarkan tahap server sebenarnya, memperbarui metadata master sheet, membaca tabel dinamis, membuat copy Docs, mengisi tabel dinamis, menghapus marker, lalu mengembalikan URL dokumen. Google Docs API tidak menyediakan operasi refresh linked table seperti tombol `Update all` di UI Docs; bagian ini tidak boleh ditandai berhasil secara otomatis sebelum mekanisme pengganti diterapkan.

Mode publikasi menggunakan `GOOGLE_USE_EXISTING_DOC=false`: template tidak diedit langsung. Copy bernama `KCDA [Kecamatan] [Tahun]` dibuat ke folder `GOOGLE_OUTPUT_FOLDER_ID`, URL hasil ditampilkan di bawah progres, dan browser membuka hasil tersebut pada tab baru.

- `package.json`
  - Next.js, React, TypeScript.
  - Script utama: `dev`, `build`, `start`, `typecheck`.

- `app/page.tsx`
  - Redirect berdasarkan session: `/dashboard` jika login, `/login` jika belum.

- `app/login/page.tsx`
  - Halaman login client-side.
  - Mengirim username/password ke `/api/auth/login`.

- `app/dashboard/page.tsx`
  - Server page yang mengecek session dan menampilkan `KcdaDashboard`.

- `components/KcdaDashboard.tsx`
  - Komponen UI utama.
  - Menyimpan state sementara untuk upload mock, form publikasi, dan KCDA selesai.
  - Daftar sumber data saat ini:
    - `PODES`
    - `Data Kecamatan`
    - `Survei Hortikultura`
    - `EMIS`
  - Daftar kecamatan hard-coded untuk Lampung Timur.
  - Form publikasi berisi:
    - kecamatan
    - year
    - catalog
    - issn
    - publication
    - director
    - responsible
    - editor
    - dataProcessor
    - layout
    - translator
  - Saat submit publikasi, hanya lima field pertama yang dikirim dan dipakai backend saat ini.

- `app/api/auth/login/route.ts`
  - Validasi username/password dari env.
  - Membuat cookie session.

- `app/api/auth/logout/route.ts`
  - Menghapus cookie session.

- `lib/auth.ts`
  - Session cookie: `kcda_up_session`.
  - Session berupa payload base64url + HMAC SHA-256.
  - Masa berlaku session: 8 jam.
  - Credential default development ada di kode, tetapi untuk deployment harus pakai env.

- `app/api/publications/create/route.ts`
  - Endpoint backend utama yang sudah berhubungan dengan Google Sheets.
  - Membuat OAuth access token manual dari Google service account menggunakan JWT RS256.
  - Scope saat ini hanya `https://www.googleapis.com/auth/spreadsheets`.
  - Menerima request:
    - `kecamatan`
    - `year`
    - `catalog`
    - `issn`
    - `publication`
  - Menulis data ke Google Sheets API range `'HALAMAN DEPAN'!B1:B5` dengan `valueInputOption=USER_ENTERED`.

- `app/globals.css`
  - Semua styling aplikasi.

## Environment Variables

Variabel yang digunakan saat ini:

- `APP_SECRET`
  - Secret untuk HMAC session.

- `APP_USERNAME`
  - Username admin.

- `APP_PASSWORD`
  - Password admin.

- `GOOGLE_SHEET_ID`
  - ID spreadsheet master data.

- `GOOGLE_MASTER_SHEET_NAME`
  - Nama sheet target identitas publikasi. Default backend: `HALAMAN DEPAN`.

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - Email service account Google.
  - Dipakai oleh `app/api/publications/create/route.ts`, tetapi belum tercantum di `.env.example`.

- `GOOGLE_PRIVATE_KEY`
  - Private key service account.
  - Bisa berupa teks PEM dengan `\n` escaped atau base64 dari PEM.
  - Dipakai oleh `app/api/publications/create/route.ts`, tetapi belum tercantum di `.env.example`.

Jangan menyalin nilai rahasia dari `.env` ke dokumentasi atau source. Jika perlu menambah dokumentasi env, tulis nama variabel dan formatnya saja.

## Model Data Saat Ini

Belum ada model data formal. State masih di React client state dan Google Sheet langsung.

Entitas yang sudah tersirat:

- User/admin
  - Saat ini hanya satu credential dari env.

- Data source upload
  - Jenis: PODES, Data Kecamatan, Survei Hortikultura, EMIS.
  - Status upload saat ini hanya mock di client.

- Publication identity
  - Kecamatan, tahun, nomor katalog, ISSN, nomor publikasi.
  - Sudah dapat dikirim ke master Google Sheet.

- Publication team
  - Pengarah, penanggung jawab, penyunting, pengolah data/penulis naskah, penata letak, penerjemah.
  - Ada di form, tetapi belum dikirim/dipakai backend.

## Integrasi Google Yang Perlu Diperhatikan

Integrasi yang sudah berjalan secara kode:

- Google Sheets API via service account.
- Manual JWT flow menggunakan `node:crypto`.
- Range update memakai endpoint:
  - `PUT https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}?valueInputOption=USER_ENTERED`

Integrasi yang kemungkinan diperlukan berikutnya:

- Google Drive API
  - Untuk copy template Google Docs dan mengatur file output.

- Google Docs API
  - Untuk replace text placeholders.
  - Untuk insert/delete table rows pada bagian dinamis.
  - Untuk mengisi konten yang tidak cocok sebagai linked object.

- Google Sheets API tambahan
  - Untuk clear/update banyak range.
  - Untuk batchUpdate.
  - Untuk membaca mapping master data.

- Google Apps Script atau Apps Script API
  - Bisa dipertimbangkan jika linked object refresh/copy behavior lebih mudah dikendalikan dari Apps Script.

Jika menambahkan Google Docs/Drive, scope service account harus diperluas dan file Google Drive/Docs/Sheets harus dibagikan ke service account.

## File Google Aktif

- Master Sheet:
  - ID: `1o-yODjHh4zmNshFbZ7pwjtlt_U7Zsik3sJxRh7dJpho`
  - Judul terdeteksi: `Master KCDA 1804`
  - Tab penting:
    - `HALAMAN DEPAN`
    - `HALAMAN INFO`
    - `BAB 1`
    - `BAB 2`
    - `BAB 3`
    - `BAB 4`
    - `BAB 5`
    - `Bab 6`
    - `Bab 7`
    - `HALAMAN BELAKANG`
    - `DATABASE PENDUDUK WILAYAH`
    - `DATABASE HORTI`
    - `Database PODES`
    - `Database PODES N-1`
    - `DATABASE EMIS`
    - `DATABASE EMIS N-1`
    - `Master`

- Template/target Google Docs:
  - ID: `1PNMoMmTwqNBcCqImb1XkbyHAHsOktFekpFsSSmNh2MU`
  - Judul terdeteksi: `MASTER KCDA 1804`
  - Google Docs API dan Google Drive API sudah aktif dan bisa diakses service account.
  - Drive capabilities terdeteksi: service account bisa edit dan copy dokumen.
  - Dokumen memakai Google Docs tabs; konten utama berada di tab `t.0`.
  - Jumlah tabel terdeteksi di dokumen: 129.

## Tabel Dinamis Awal

Fokus step pertama adalah tabel yang jumlah row-nya mengikuti jumlah desa dalam kecamatan. Untuk contoh data Way Jepara di master sheet, ada 16 desa dan 1 baris total kecamatan.

Tabel dinamis yang sudah teridentifikasi di master sheet:

- `BAB 1`
  - Tabel `1.1`: mulai sekitar row 55.
    - Header: Desa, Luas, Persentase terhadap luas kecamatan.
    - Data desa mulai sekitar row 61.
    - Baris total kecamatan muncul setelah blok desa.
  - Tabel `1.2`: mulai sekitar row 87.
    - Header: Desa, jarak ke ibu kota kecamatan, jarak ke ibu kota kabupaten/kota.
    - Data desa mulai sekitar row 93.

- `BAB 2`
  - Tabel `2.1.1`: mulai sekitar row 57.
    - Header: Desa, RW, RT.
    - Data desa mulai sekitar row 63.
  - Tabel `2.2.1`: mulai sekitar row 90.
    - Header: Pemerintah daerah, laki-laki, perempuan, jumlah.
    - Termasuk baris pemerintah kecamatan lalu pemerintah desa.

- `BAB 3`
  - Tabel `3.1`: mulai sekitar row 56.
    - Bagian pertama: Desa, laki-laki, perempuan, jumlah.
  - `Lanjutan Tabel 3.1`: mulai sekitar row 86.
    - Bagian lanjutan: Desa, distribusi penduduk, kepadatan penduduk, rasio jenis kelamin.

Strategi teknis yang disarankan untuk Google Docs:

1. Tabel template di Google Docs tetap disiapkan manual dengan header dan satu baris contoh/data marker.
2. Backend membaca data tabel dari master sheet.
3. Backend menemukan tabel target di Google Docs memakai marker teks stabil di dekat tabel, misalnya `{{TABLE_1_1}}`, `{{TABLE_1_2}}`, `{{TABLE_2_1_1}}`, `{{TABLE_2_2_1}}`, `{{TABLE_3_1}}`, dan `{{TABLE_3_1_LANJUTAN}}`.
4. Backend menghapus/menambah row data pada tabel target agar sesuai jumlah data desa.
5. Backend mengisi cell tabel menggunakan Google Docs API `batchUpdate`.

Marker teks lebih aman daripada mencari tabel hanya berdasarkan urutan tabel, karena struktur dokumen publikasi bisa berubah.

## Arsitektur Target Yang Masuk Akal

Untuk pengembangan berikutnya, arah yang paling rapi:

1. Pisahkan client UI dan Google service helper.
2. Buat modul server khusus Google auth/client, misalnya `lib/google.ts`.
3. Buat konfigurasi mapping template Excel ke master sheet, misalnya `lib/kcda-mappings.ts`.
4. Buat API upload per sumber data atau satu API upload dengan `dataKind`.
5. Parse Excel di server, validasi header/template, lalu tulis ke master Google Sheet.
6. Buat API generate publication:
   - tulis metadata publikasi ke master sheet,
   - copy template Google Docs,
   - refresh/update linked objects jika mekanismenya memungkinkan,
   - isi bagian dinamis via Docs API,
   - kembalikan link Docs hasil.

## Catatan Gap Teknis

- `.env.example` belum menyebut `GOOGLE_SERVICE_ACCOUNT_EMAIL` dan `GOOGLE_PRIVATE_KEY`, padahal endpoint Google Sheet membutuhkannya.
- Form `PublicationForm` punya field tim penyusun, tetapi backend `PublicationRequest` belum menerima field tersebut.
- Tombol upload hanya memanggil `mockUpload`; belum ada input file.
- Tombol update database masih disabled/placeholder.
- `completedKcda` hanya disimpan di state browser, hilang saat refresh.
- `YEARS` dibuat dari tahun runtime browser/server saat ini dan berisi tahun sekarang sampai 10 tahun ke depan.
- Proyek bukan git repository pada saat catatan dibuat.

## Prinsip Implementasi Lanjutan

- Jangan hard-code range penting tanpa dokumentasi mapping.
- Untuk Excel, validasi template secara eksplisit:
  - nama sheet,
  - header,
  - kolom wajib,
  - tipe data,
  - tahun/kecamatan jika tersedia.
- Untuk Google Sheet master, bedakan:
  - area input metadata publikasi,
  - area tabel statis untuk linked object,
  - area tabel dinamis untuk Docs API.
- Untuk Google Docs, gunakan placeholder yang stabil dan mudah dicari, misalnya `{{NAMA_KECAMATAN}}` atau marker blok seperti `{{START_TABEL_DESA}}`.
- Linked object cocok untuk tabel/range yang bentuknya tetap atau bisa dirapikan di Google Sheet.
- Google Docs API lebih cocok untuk daftar/tabel dengan jumlah row berubah, narasi dinamis, dan bagian yang perlu insert/delete struktur dokumen.
- Jaga agar backend tidak mengembalikan private error yang berisi credential.

## Cara Cepat Menjalankan

Install dependency sudah ada di `node_modules`, tetapi cara standar:

```bash
npm install
npm run dev
```

Cek type:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

## Ringkasan Mental Model

Anggap proyek ini sebagai orkestrator publikasi KCDA:

- UI Next.js adalah ruang kerja admin.
- Excel upload adalah input mentah yang harus divalidasi.
- Google Sheet adalah master database dan sumber linked object.
- Google Docs template adalah bentuk publikasi akhir.
- Linked object menangani bagian yang bisa diambil langsung dari sheet.
- Google service/API menangani bagian yang strukturnya dinamis.

Saat ini baru fondasi UI + login + satu jalur tulis metadata ke Google Sheet. Pekerjaan inti berikutnya adalah membangun pipeline Excel ke master sheet, lalu pipeline master sheet ke Google Docs.

### Survei Hortikultura

Tujuh file tabel divalidasi dari sheet `Tabel`, menggunakan data 24 kecamatan pada baris 8-31. Data ditulis tanpa mengganti kolom tahun dan kecamatan di `DATABASE HORTI`:

- 5.1.1 -> `C3:L26`
- 5.1.2 -> `M3:V26`
- 5.1.5 -> `W3:AD26`
- 5.1.6 -> `AE3:AL26`
- 5.1.9 -> `AM3:AT26`
- 5.1.10 -> `AU3:BB26`
- 5.1.13 -> `BC3:BL26`
