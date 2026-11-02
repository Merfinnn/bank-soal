# Siap Ujian — Bank Soal Terstandardisasi

Prototipe web responsif untuk mengeksplorasi arsip ujian kampus, membaca pembahasan, dan mengirim kontribusi soal ke antrean moderasi.

## Menjalankan aplikasi terintegrasi

Pasang dependensi dengan `npm install`, siapkan PostgreSQL dan `.env`, lalu jalankan `npm run dev` untuk Next.js dan `npm run api:dev` di terminal terpisah untuk NestJS. Next.js meneruskan `/api/*` ke NestJS melalui `API_INTERNAL_BASE_URL` (default lokal `http://127.0.0.1:3001`); browser memakai jalur same-origin `/api`, sehingga cookie sesi dan CSRF tidak memerlukan CORS. Untuk deployment, atur URL internal API yang dapat dijangkau container frontend. `NEXT_PUBLIC_API_BASE_URL` opsional dan default ke `/api`. Atur `APP_ORIGIN` ke origin browser yang digunakan. Gunakan HTTPS saat menguji cookie sesi `Secure` di luar localhost.

`index.html` tetap tersedia sebagai prototipe visual mandiri. Data contoh, solusi, dan diskusinya tidak tersambung ke database; gunakan aplikasi Next.js di atas untuk autentikasi, katalog, unggah, moderasi, serta diskusi yang persisten.

## Fitur

- Navigasi utama tiga tab: **Beranda**, **Eksplorasi Soal**, dan **Unggah Soal**.
- Pemilih berurutan Fakultas → Program Studi → Mata Kuliah, dengan 7 fakultas dan 29 program studi sesuai daftar kampus.
- Kartu fakultas, pencarian saran otomatis, arsip contoh dari setiap program studi, dan filter fakultas/program/semester/status pembahasan.
- Mode belajar dua panel untuk soal digital atau pratinjau PDF/foto, pembahasan, penilaian, serta diskusi.
- Wisaya unggah: metadata wajib, pilihan tulis soal atau unggah PDF/foto, pratinjau berkas di peramban, pembahasan tertulis atau lampiran PDF kunci jawaban, persetujuan, dan status moderasi.
- Jenis berkas soal: PDF, PNG, JPG/JPEG hingga 15 MB. Lampiran pembahasan menerima PDF hingga 15 MB.
- Frontend Next.js App Router, Tailwind CSS, dan Lucide terintegrasi di `app/` dengan komponen katalog, unggah, dan moderasi di `components/`.

Data arsip yang tampak pada prototipe adalah data contoh untuk demonstrasi. Validasi peramban tidak menggantikan pemeriksaan server, penyimpanan yang aman, verifikasi izin distribusi, atau moderasi.

## Skema dan seed PostgreSQL

`prisma/schema.prisma` mendefinisikan `Faculty`, `Department`, `Course`, `ExamPaper` (termasuk `pdfUrl` dan `answerUrl`), `Question`, aktivitas pengguna, dan jadwal ujian. Fakultas, program studi, mata kuliah, dan topik RPS memakai `deletedAt` agar arsip lama tetap terhubung. `prisma/taxonomy.ts` menjadi sumber data 7 fakultas dan 29 program studi; `prisma/seed.ts` mengaktifkan entri yang ditetapkan dan menonaktifkan entri lama yang tidak termasuk taksonomi tetap. Seeder juga mengisi enam mata kuliah contoh untuk Informatika (Algoritma dan Pemrograman, Kalkulus, Matematika Diskrit, Struktur Data, Basis Data, dan Sistem Operasi) agar pemilih berjenjang dapat diuji. Data ini adalah data demonstrasi, bukan kurikulum resmi.

Jalankan `npm run db:seed` kembali setelah pembaruan taksonomi untuk mengisi atau memperbarui mata kuliah contoh secara idempoten.

Konfigurasi menggunakan Prisma ORM 7 dan adapter PostgreSQL. Atur `DATABASE_URL` ke PostgreSQL yang dapat dijangkau dari lingkungan aplikasi, lalu jalankan `npm run db:migrate:deploy` dan `npm run db:seed`. Migrasi awal pada `prisma/migrations` ditujukan untuk basis data baru/kosong; jangan jalankan langsung pada basis data lama yang sudah mempunyai tabel tanpa proses baseline dan peninjauan data terlebih dahulu.

## Backend NestJS dan autentikasi sesi

Backend ada di `backend/src`. Jalankan `npm run api:dev` untuk pengembangan, `npm run api:build` untuk mengompilasi, dan `npm run api:start` untuk menjalankan hasil build.

- `GET /health` — pemeriksaan kesehatan.
- `GET /csrf` — membuat atau memperbarui sesi keamanan guest dan mengembalikan token CSRF.
- `POST /register`, `POST /login`, `POST /logout`, `GET /me`.
- `POST /recovery/request`, `POST /recovery/complete`.

Permintaan perubahan data harus mengirim cookie sesi dan header `X-CSRF-Token` dari `/csrf`; permintaan perubahan juga harus berasal dari origin yang sama. Cookie sesi selalu `HttpOnly`, `Secure`, dan `SameSite=Lax`. Layani aplikasi lokal melalui HTTPS saat menguji cookie lewat browser; jangan menurunkan atribut Secure di deployment.

Kata sandi di-hash memakai Argon2id. Sesi opaque acak disimpan sebagai hash di PostgreSQL dan berlaku tujuh hari. RBAC ditolak secara default oleh `SessionAuthGuard`; tetapkan `@Roles(...)` pada endpoint terlindungi. Login dibatasi lima percobaan per IP dalam 15 menit; pemulihan dibatasi tiga permintaan per jam.

Pemulihan kata sandi memerlukan `APP_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, dan `SMTP_FROM`. `SMTP_USER`/`SMTP_PASSWORD` opsional untuk SMTP tanpa autentikasi. Token pemulihan sekali pakai disimpan sebagai hash dan berlaku 30 menit. Respons permintaan pemulihan tidak mengungkapkan apakah alamat email terdaftar.

## Penyimpanan berkas privat

Backend memakai AWS SDK default credential chain. Atur `AWS_REGION=ap-southeast-3` dan `AWS_S3_BUCKET`; pada EC2, berikan izin lewat instance role, bukan kunci AWS statis. Bucket harus memblokir seluruh akses publik dan tidak mengaktifkan ACL publik. Izinkan `s3:PutObject` dan `s3:GetObject` hanya pada awalan `uploads/*`; atur CORS bucket agar hanya menerima origin frontend yang digunakan.

- `POST /storage/uploads/presign` memerlukan sesi Kontributor, Moderator, atau Admin serta CSRF. Isian: `kind` (`EXAM_DOCUMENT` atau `ANSWER_KEY`), `originalName`, `contentType`, dan `sizeBytes`.
- Respons menyediakan `uploadUrl`, `fields`, `uploadId`, `storageMode`, dan masa berlaku lima menit. Jika `storageMode` bernilai `S3`, kirim berkas langsung ke S3 sebagai multipart `FormData` berisi semua `fields` lalu `file`.
- Dokumen ujian menerima `.pdf`, `.png`, `.jpg`, `.jpeg` dengan MIME yang cocok; kunci jawaban hanya `.pdf`. Batas ukuran 15 MiB diberlakukan oleh validasi API dan kebijakan presigned POST S3.
- `GET /storage/uploads/:uploadId/download-url` memeriksa sesi dan kepemilikan/izin. Tautan S3 berlaku lima menit; di mode lokal, pengunduhan dialirkan melalui endpoint API yang memeriksa hak akses.
- `StorageUpload` menyimpan kunci objek privat dan metadata reservasi. Simpan `objectKey`/`uploadId` sebagai referensi, bukan URL bertanda tangan atau URL publik.

Dalam `NODE_ENV=development` saja, jika bucket atau kredensial AWS tidak tersedia, backend memakai folder `./uploads` yang tidak disajikan sebagai konten statis. Unggah tetap memerlukan sesi dan CSRF; berkas tertunda hanya dapat diakses pemilik atau moderator, dan jalur publik hanya mengalirkan arsip yang sudah disetujui. Jalankan backend dengan `npm run api:dev` untuk mengaktifkan mode development. Lingkungan lain tidak pernah memakai penyimpanan lokal dan akan gagal secara eksplisit bila S3 belum dikonfigurasi. Salin `.env.example` sebagai acuan konfigurasi; jangan commit `.env` atau kredensial.

## Alur kontribusi dokumen

Modal `components/UnggahDokumenModal.tsx` meminta token CSRF dan reservasi unggahan. Di produksi, berkas dikirim langsung ke S3 melalui presigned POST; pada development tanpa konfigurasi AWS, berkas dikirim ke endpoint lokal terautentikasi dan disimpan privat di disk. Setelah itu metadata dikirim ke `POST /exam-papers`. `NEXT_PUBLIC_API_BASE_URL` boleh diatur bila API berada pada path dasar berbeda; nilai kosong memakai origin yang sama seperti reverse proxy produksi. Komponen memerlukan daftar fakultas dan mata kuliah yang menyertakan ID mata kuliah, kode fakultas, dan program studi.

`POST /exam-papers` memvalidasi mata kuliah aktif, kepemilikan dan jenis reservasi berkas, keberadaan objek dan kecocokan ukuran/MIME, pembahasan wajib, serta persetujuan hak distribusi. Kunci objek disimpan pada `pdfUrl`/`answerUrl`, persetujuan dicatat pada `distributionConfirmedAt`, dan arsip dibuat dengan status `PENDING`; reservasi berkas kemudian dikaitkan secara transaksional. Unggahan manual tanpa PDF soal juga didukung.

## Katalog dan moderasi

- `GET /taxonomy` mengirimkan fakultas, program studi, dan mata kuliah aktif dari PostgreSQL untuk pilihan UI.
- `GET /exam-papers` hanya mengembalikan arsip `APPROVED`. Filter yang tersedia: `q` (nama/kode mata kuliah, nama dosen, fakultas, atau topik), `kodeFakultas`, `departmentId`, `semester`, `statusPembahasan=ada|mentah`, `page`, dan `limit`.
- `GET /exam-papers/:id/download-url?jenis=soal|pembahasan` hanya membuat tautan bertanda tangan untuk lampiran arsip yang sudah disetujui.
- `GET /moderation/exam-papers` dibatasi untuk Moderator/Admin. `PATCH /moderation/exam-papers/:id/approve` memerlukan konfirmasi pemeriksaan kebocoran; sebelum publikasi, objek S3 diperiksa kembali dan tautan unggah harus sudah kedaluwarsa. `PATCH /moderation/exam-papers/:id/reject` mewajibkan alasan dan menonaktifkan lampiran dari akses unduh.
- `components/EksplorasiSoal.tsx` memuat taksonomi dan katalog langsung dari API, dengan pencarian tertunda, filter server, dan halaman hasil. `components/ModerasiAntrian.tsx` menyediakan antrean, tautan pemeriksaan lampiran, persetujuan, dan penolakan.

## Analytics kunjungan arsip

- `POST /exams/:id/view` hanya mencatat arsip yang telah disetujui dan taksonominya masih aktif. Pengunjung yang masuk dideduplikasi berdasarkan ID pengguna; tamu memakai cookie sesi anonim `HttpOnly`, `SameSite=Lax`, dan `Secure` di produksi.
- Model `PaperView` menyimpan kunci pengunjung berbentuk hash dan membatasi satu kunjungan per arsip dalam jendela bergulir 24 jam. Pembaruan dilakukan atomik; endpoint juga dibatasi 30 permintaan per menit.
- `GET /exams/stats/approved-count` mengembalikan jumlah arsip publik yang disetujui. `GET /exams/stats/popular` mengembalikan hingga lima arsip dengan jumlah kunjungan tertinggi. Keduanya tidak menyertakan arsip pending/ditolak dan mengirim `Cache-Control: no-store`.
- Widget statistik di Beranda meminta data tersebut di sisi klien tanpa cache. Statistik “soal dibagikan” pada halaman Unggah memakai jumlah arsip terverifikasi yang sama; jadwal ujian terdekat sementara disembunyikan.

## Next.js, autentikasi, dan diskusi

`app/` adalah Next.js App Router. Jalankan `npm run dev` untuk pengembangan, `npm run build` untuk membangun, dan `npm run start` untuk menjalankan hasil produksi. Halaman yang tersedia: Beranda (`/`), Eksplorasi (`/eksplorasi`), Unggah (`/unggah`), Moderasi (`/moderasi`), masuk/daftar (`/login`, `/register`), dan mode belajar (`/soal/:id`). Komponen berbagi `AuthProvider` yang memeriksa `GET /me` saat dimuat, mengirim cookie sesi dengan `credentials: "include"`, dan tidak menyimpan token autentikasi di penyimpanan browser. Navigasi menampilkan nama akun dan tombol keluar, atau tautan masuk/daftar untuk tamu.

Pembahasan arsip yang disetujui dimuat dari `GET /exam-papers/:id`; komentar tersimpan pada model `DiscussionComment` dan tersedia melalui `GET`/`POST /exam-papers/:id/comments` serta alias `GET`/`POST /api/exams/:id/comments`. Penulisan komentar memerlukan sesi aktif dan header CSRF. Pengunjung dapat membaca diskusi namun tidak melihat kolom komentar.

### Seeder akun admin lokal

Seeder khusus `prisma/seed-admin.ts` membuat atau memperbarui `admin@siapujian.local` dengan peran `ADMIN` dan hash Argon2id. Untuk Windows PowerShell, jalankan perintah berikut dari root proyek:

```powershell
$env:ADMIN_SEED_PASSWORD = "adminpassword"
npm run db:seed:admin
Remove-Item Env:ADMIN_SEED_PASSWORD
```

Kata sandi harus 12–128 karakter. Seeder menolak `NODE_ENV=production`; kredensial contoh hanya untuk database lokal dan wajib diganti sebelum penggunaan lain. Proses seed tidak mencetak kata sandi.

Step 1–6 telah diterapkan: sinkronisasi skema/seed, autentikasi sesi, integrasi S3, alur unggah, katalog/moderasi, serta integrasi status UI dan diskusi. Sebelum produksi, tambahkan pemindaian malware, audit moderasi, dan pemeriksaan izin distribusi soal. URL pratinjau lokal tidak boleh disimpan sebagai `pdfUrl`.
