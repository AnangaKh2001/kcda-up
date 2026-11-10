# KCDA Up! - Project Context

Dokumen ini menyimpan konteks teknis terkini agar pengembangan dapat dilanjutkan tanpa mempelajari proyek dari awal. Jangan menaruh ID resource, email pengguna, token, private key, atau nilai environment produksi di file ini.

## Tujuan Proyek

KCDA Up! mengotomatisasi proses penyusunan publikasi Kecamatan Dalam Angka (KCDA):

1. Pengguna masuk melalui Google OAuth.
2. File Excel sumber divalidasi dan ditulis ke master Google Sheets.
3. Identitas publikasi serta tim penyusun diperbarui di master sheet.
4. Template Google Docs disalin ke folder output.
5. Tabel dengan jumlah baris dinamis diisi melalui Google Docs API.
6. Aplikasi menampilkan progres, log, dan URL dokumen hasil.

## Stack

- Next.js App Router, React, dan TypeScript.
- ExcelJS untuk membaca serta memvalidasi workbook.
- Google OAuth 2.0 untuk autentikasi pengguna.
- Google Sheets API, Google Docs API, dan Google Drive API.
- Deployment ditujukan untuk Vercel.

## Halaman dan Route

- `/login`: login Google OAuth.
- `/dashboard`: ringkasan aplikasi.
- `/data-sumber`: unduh template, unggah file, validasi, dan update database.
- `/publikasi`: identitas publikasi, tim penyusun, serta pembuatan KCDA.

Route API:

- `/api/auth/google`: memulai OAuth web-server flow.
- `/api/auth/google/callback`: pertukaran authorization code dan verifikasi email.
- `/api/auth/logout`: menghapus session.
- `/api/data-sources/validate`: memvalidasi satu workbook.
- `/api/data-sources/update`: validasi ulang, backup, update, verifikasi, dan rollback.
- `/api/publications/create`: membaca metadata atau membuat publikasi dengan stream progres NDJSON.

## Autentikasi

- Login utama menggunakan Google OAuth.
- Scope pengguna mencakup OpenID/email/profile, Sheets, Docs, dan Drive.
- Hanya email dalam `GOOGLE_ALLOWED_EMAILS` yang diterima.
- Session disimpan dalam cookie `kcda_up_session` yang terenkripsi AES-256-GCM, `HttpOnly`, dan berlaku 8 jam.
- OAuth state disimpan sementara untuk mencegah request callback yang tidak sah.
- Callback URI dihitung dari host request dan header proxy, sehingga bekerja pada localhost dan Vercel.
- `APP_USERNAME`, `APP_PASSWORD`, dan `GOOGLE_OAUTH_REDIRECT_URI` masih ada di environment lokal untuk kompatibilitas, tetapi tidak digunakan oleh alur login utama.

## Data Sumber

Update dapat dilakukan sebagian; pengguna tidak harus mengunggah semua file sekaligus. File diperiksa ketika dipilih dan divalidasi ulang di server sebelum ditulis.

Dataset aktif:

- Data Kecamatan:
  - Jumlah Penduduk -> `DATABASE PENDUDUK WILAYAH!A1:I266`
  - Penduduk Menurut Umur -> `DATABASE PENDUDUK WILAYAH!S1:V385`
  - Jarak Desa -> `DATABASE PENDUDUK WILAYAH!AB1:AE265`
  - PNS pendidikan -> `DATABASE PENDUDUK WILAYAH!AG1:AK241`
  - PNS desa -> `DATABASE PENDUDUK WILAYAH!AM1:AP265`
  - Jumlah RT/RW -> `DATABASE PENDUDUK WILAYAH!AR1:AU265`
- EMIS:
  - EMIS N -> `DATABASE EMIS!A1:BC27`
  - EMIS N-1 -> `DATABASE EMIS N-1!A1:BC27`
- Survei Hortikultura:
  - Tabel 5.1.1 -> `DATABASE HORTI!C3:L26`
  - Tabel 5.1.2 -> `DATABASE HORTI!M3:V26`
  - Tabel 5.1.5 -> `DATABASE HORTI!W3:AD26`
  - Tabel 5.1.6 -> `DATABASE HORTI!AE3:AL26`
  - Tabel 5.1.9 -> `DATABASE HORTI!AM3:AT26`
  - Tabel 5.1.10 -> `DATABASE HORTI!AU3:BB26`
  - Tabel 5.1.13 -> `DATABASE HORTI!BC3:BL26`

PODES masih tampil sebagai input nonaktif karena mapping dan proses update belum diterapkan.

Validator memeriksa format `.xlsx`, nama dan jumlah sheet, header, batas area, tipe data, urutan kecamatan/kelompok, serta larangan formula atau error Excel. Update database memerlukan konfirmasi `YAKIN UPDATE`, membuat backup nilai lama, menulis data baru, membaca ulang hasil, dan melakukan rollback jika proses gagal.

Semua template aktif disimpan di `public/templates` dan dapat diunduh dari setiap baris input.

## Metadata Publikasi

Mapping aktif:

- `HALAMAN DEPAN!B1:B5`: kecamatan, tahun, katalog, ISSN, nomor publikasi.
- `HALAMAN INFO!A63`: pengarah.
- `HALAMAN INFO!A66`: penanggung jawab.
- `HALAMAN INFO!A69`: penyunting.
- `HALAMAN INFO!A72`: pengolah data dan penulis naskah.
- `HALAMAN INFO!A75`: penata letak.
- `HALAMAN INFO!A78`: penerjemah.
- `BAB 1!G3`: teks kecamatan untuk marker footer.

Form membaca nilai awal dari master sheet. Saat publikasi dibuat, seluruh identitas dan tim penyusun ditulis kembali. Beberapa nama pengolah data dipisahkan dengan karakter `•` di sheet dan baris baru di form.

## Pembuatan Google Docs

Konfigurasi resource selalu melalui environment variable:

- `GOOGLE_SHEET_ID`: master spreadsheet.
- `GOOGLE_DOC_TEMPLATE_ID`: template Google Docs.
- `GOOGLE_OUTPUT_FOLDER_ID`: folder Drive hasil.
- `GOOGLE_USE_EXISTING_DOC=false`: membuat salinan baru dan menjaga template tetap utuh.

Dokumen hasil diberi nama `KCDA [Kecamatan] [Tahun]`. Proses memerlukan konfirmasi `YAKIN BUAT PUBLIKASI`, mengirim log NDJSON, dan membuka URL hasil setelah sukses.

Tabel dinamis:

- `{{TABLE_1_1}}`
- `{{TABLE_1_2}}`
- `{{TABLE_2_1_1}}`
- `{{TABLE_2_2_1}}`
- `{{TABLE_3_1}}`
- `{{TABLE_3_1_LANJUTAN}}`

Backend membaca data `BAB 1`, `BAB 2`, dan `BAB 3`, menambah atau menghapus row pada tabel Docs, mengisi cell, menerapkan warna dari master sheet, memformat nama pemerintah desa/kecamatan, lalu menghapus marker teknis.

Deteksi total membaca seluruh blok data dan hanya menganggap kemunculan terakhir nama kecamatan sebagai total. Hal ini menjaga desa seperti Sukadana atau Purbolinggo tetap ikut dimasukkan ketika nama desa sama dengan nama kecamatan.

Footer memakai marker `{{FOOTER_KECAMATAN}}`. Marker diganti berdasarkan indeks segment footer menggunakan nilai `BAB 1!G3`, sehingga style template dipertahankan dan teks nama kecamatan tidak terpotong.

## Batasan Linked Object

Google Docs API tidak menyediakan aksi yang setara dengan tombol **Update all linked objects**. Linked object pada dokumen salinan masih dapat merujuk ke master sheet yang sama. Jika master berpindah ke kecamatan lain sebelum linked object dokumen sebelumnya diselesaikan, pembaruan ulang dapat mengambil data kecamatan terbaru.

Urutan aman:

1. Set master untuk satu kecamatan.
2. Buat dokumen KCDA.
3. Selesaikan pembaruan linked object dokumen tersebut.
4. Baru pindahkan master ke kecamatan berikutnya.

Jangan menjalankan batch beberapa kecamatan menggunakan satu master yang sama tanpa mekanisme pembekuan atau unlink linked object.

## Environment Variables

Key `.env.example` diselaraskan dengan `.env`:

- `APP_SECRET`
- `APP_USERNAME` (legacy/tidak dipakai login utama)
- `APP_PASSWORD` (legacy/tidak dipakai login utama)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_ALLOWED_EMAILS`
- `GOOGLE_OAUTH_REDIRECT_URI` (referensi kompatibilitas; callback dihitung otomatis)
- `GOOGLE_SHEET_ID`
- `GOOGLE_MASTER_SHEET_NAME`
- `GOOGLE_DOC_TEMPLATE_ID`
- `GOOGLE_USE_EXISTING_DOC`
- `GOOGLE_OUTPUT_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Service account digunakan oleh proses update database. Pembuatan publikasi menggunakan token OAuth pengguna agar salinan Docs dapat dibuat pada Drive pengguna.

## File Penting

- `components/KcdaDashboard.tsx`: UI utama dan state proses.
- `lib/auth.ts`: session terenkripsi dan allowlist email.
- `lib/google-oauth.ts`: pembentukan callback URI.
- `lib/data-source-types.ts`: daftar dataset, target, dan template.
- `lib/data-source-import.ts`: validasi serta mapping workbook.
- `app/api/data-sources/update/route.ts`: transaksi update master data.
- `app/api/publications/create/route.ts`: pembentukan publikasi dan tabel dinamis.
- `public/templates`: template Excel.
- `public/buku-panduan-kcda-up.pdf`: buku panduan pengguna.
- `README.md`: panduan setup dan penggunaan repository.

## Status dan Gap

Sudah tersedia:

- OAuth Google dan allowlist email.
- Validasi serta update 14 dataset.
- Download template per input.
- Backup, verifikasi, rollback, progress, dan log update.
- Form identitas serta tim penyusun.
- Copy Docs dan enam tabel dinamis.
- Penggantian footer dinamis.
- Buku panduan PDF.

Belum tersedia:

- Mapping dan update PODES.
- Riwayat upload atau database aplikasi tersendiri.
- Job queue/status persisten di luar request aktif.
- Otomatisasi refresh atau unlink linked object Google Docs.
- Rekap publikasi selesai yang persisten setelah browser refresh.

## Aturan Keamanan

- Jangan commit `.env`.
- Jangan menaruh ID resource produksi atau email pengguna di `.env.example`, README, atau context.
- Gunakan placeholder yang tidak dapat dipakai pada dokumentasi publik.
- Batasi akses Drive/Sheets/Docs dan rotasi secret jika pernah terekspos.
