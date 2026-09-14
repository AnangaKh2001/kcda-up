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
- Penulisan Google Sheet saat ini hanya mengisi range `B1:B5` pada sheet master, default nama sheet `HALAMAN DEPAN`.

Yang belum ada:

- Upload file Excel sebenarnya.
- Parser/validator template Excel.
- Mapping setiap template Excel ke sheet/range master data.
- Penyimpanan file upload atau riwayat upload.
- Proses update database/master data dari file Excel.
- Pembuatan/copy Google Docs template.
- Pengisian Google Docs via linked object.
- Pengisian Google Docs via Google Docs API untuk row dinamis.
- Status/progress job yang persisten.
- Database aplikasi sendiri.

## Struktur File Penting

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
