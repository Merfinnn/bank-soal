# Siap Ujian — Bank Soal Terstandardisasi

Panduan ini menjelaskan cara menjalankan Siap Ujian secara lokal menggunakan Docker Compose. Ikuti langkah berurutan agar database, backend, frontend, seeder admin, dan penyimpanan berkas siap dipakai untuk demo portofolio.

## Daftar isi

1. [Tentang Proyek](#tentang-proyek)
2. [Teknologi](#teknologi)
3. [Prasyarat](#prasyarat)
4. [Persiapan Environment](#persiapan-environment)
5. [Instalasi dan Menjalankan Aplikasi](#instalasi-dan-menjalankan-aplikasi)
6. [Panduan Penggunaan Singkat](#panduan-penggunaan-singkat)
7. [Perintah Docker yang Berguna](#perintah-docker-yang-berguna)
8. [Menjalankan Tanpa Docker](#menjalankan-tanpa-docker)
9. [Pemecahan Masalah](#pemecahan-masalah)
10. [Catatan Keamanan](#catatan-keamanan)

## Tentang Proyek

**Siap Ujian** adalah aplikasi bank soal kampus berbahasa Indonesia untuk membantu mahasiswa menemukan arsip ujian yang terorganisasi, mempelajari soal beserta pembahasannya, dan berdiskusi dengan pengguna lain.

Fitur utama:

- **Eksplorasi arsip:** pencarian dan filter berdasarkan fakultas, program studi, semester, mata kuliah, tahun, dan kelengkapan pembahasan.
- **Unggah kontribusi:** kontributor mengirim dokumen PDF atau foto, atau menulis soal secara manual dengan pembahasan.
- **Moderasi:** dokumen baru berstatus menunggu verifikasi dan tidak ditampilkan ke publik sampai disetujui Moderator/Admin.
- **Mode belajar dan diskusi:** pengguna dapat membuka arsip yang telah disetujui, membaca pembahasan, dan berdiskusi. Pengguna harus masuk untuk menulis komentar.
- **Analytics:** jumlah arsip yang disetujui dan paket soal populer dihitung dari kunjungan arsip. Kunjungan dideduplikasi per pengunjung untuk jangka 24 jam.

### Penyimpanan hybrid

Metadata, akun, sesi, komentar, antrean moderasi, dan catatan kunjungan disimpan di **PostgreSQL** melalui Prisma ORM.

Untuk demo lokal, backend berjalan dengan `NODE_ENV=development`. Jika bucket S3 atau kredensial AWS tidak dikonfigurasi, berkas yang diunggah disimpan pada folder `./uploads` di host melalui bind mount Docker. Berkas tetap berada di volume tersebut saat container backend dibuat ulang atau dimulai ulang. Jika S3 dikonfigurasi dengan benar, layanan penyimpanan dapat memakai S3; fallback disk lokal hanya berlaku di mode development.

## Teknologi

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, dan Lucide React.
- Backend: NestJS dan TypeScript.
- Database: PostgreSQL 16 dan Prisma ORM.
- Penyimpanan demo lokal: folder `./uploads`, persisten melalui Docker bind mount.
- Penyimpanan cloud opsional: AWS S3 region Jakarta (`ap-southeast-3`).
- Autentikasi: sesi server dengan cookie `HttpOnly`, bukan JWT di `localStorage`; kata sandi di-hash memakai Argon2id.

## Prasyarat

- **Docker Desktop** versi terkini, dengan Docker Compose v2 aktif.
- **Git** untuk mengambil atau memperbarui kode sumber.
- **Node.js 22 LTS** dan npm jika ingin menjalankan Prisma CLI atau aplikasi langsung dari host. Node.js tidak diperlukan untuk menjalankan seluruh stack dalam container.
- Port lokal **3000**, **3001**, dan **5433** tersedia. PostgreSQL host yang sudah memakai port 5432 tidak akan bentrok: Compose mempublikasikan PostgreSQL container pada port 5433 secara default. Jika port tersebut sudah dipakai, ubah `POSTGRES_HOST_PORT` pada `.env`.

Pastikan Docker berjalan:

```powershell
docker --version
docker compose version
git --version
```

## Persiapan Environment

### 1. Buat berkas `.env`

Di PowerShell pada direktori root proyek:

```powershell
Copy-Item .env.example .env
```

Buka `.env` dan sesuaikan nilainya untuk komputer lokal. Contoh konfigurasi yang digunakan Docker Compose:

```dotenv
POSTGRES_DB=siap_ujian
POSTGRES_USER=siap_ujian
POSTGRES_PASSWORD=siap_ujian_local_password
POSTGRES_HOST_PORT=5433

# URL host untuk menjalankan Prisma CLI dari komputer lokal.
# Backend di Docker otomatis memakai hostname "db", bukan "localhost".
DATABASE_URL=postgresql://siap_ujian:siap_ujian_local_password@localhost:5433/siap_ujian?schema=public

APP_ORIGIN=http://localhost:3000
DOCKER_APP_ORIGIN=http://localhost:3000
API_INTERNAL_BASE_URL=http://backend:3001
NEXT_PUBLIC_API_BASE_URL=/api
NODE_ENV=development
PORT=3001

AWS_REGION=ap-southeast-3
AWS_S3_BUCKET=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Siap Ujian <noreply@localhost>

ADMIN_SEED_PASSWORD=adminpassword
```

### 2. Penjelasan variabel penting

| Variabel | Kegunaan |
|---|---|
| `POSTGRES_DB` | Nama database yang dibuat oleh container PostgreSQL. |
| `POSTGRES_USER` | Pengguna database lokal. |
| `POSTGRES_PASSWORD` | Kata sandi database lokal. Ganti untuk setiap lingkungan yang bukan demo lokal. |
| `POSTGRES_HOST_PORT` | Port host yang dipetakan ke PostgreSQL container (5433 secara default); dapat diubah jika sudah dipakai proses lain. |
| `DATABASE_URL` | URL PostgreSQL untuk Prisma. Nilai pada `.env.example` memakai `localhost:5433` agar Prisma CLI di host dapat terhubung ke port yang dipublikasikan. Di dalam container backend, Compose mengganti hostname menjadi `db` dan memakai port internal 5432. |
| `APP_ORIGIN` | Origin frontend untuk backend yang dijalankan langsung dari host. Saat demo lokal, gunakan `http://localhost:3000`. |
| `DOCKER_APP_ORIGIN` | Origin yang dipakai backend dalam Compose. Default-nya `http://localhost:3000`, sesuai alamat browser demo; gunakan variabel terpisah ini jika port atau origin frontend lokal diubah. |
| `API_INTERNAL_BASE_URL` | Alamat backend yang digunakan Next.js dalam jaringan Compose: `http://backend:3001`. |
| `NEXT_PUBLIC_API_BASE_URL` | Prefix API yang dipanggil browser. `/api` diteruskan oleh Next.js ke backend sehingga sesi tetap same-origin. |
| `NODE_ENV` | Harus `development` untuk mengaktifkan fallback penyimpanan lokal. Compose menetapkannya pada container backend. |
| `AWS_S3_BUCKET` | Kosongkan untuk memakai penyimpanan lokal pada demo. Isi hanya jika menguji S3 dan kredensial AWS tersedia. |
| `AWS_REGION` | Region S3 yang didukung aplikasi, yaitu `ap-southeast-3` (Jakarta). |
| `SMTP_*` | Opsional, untuk pengiriman email pemulihan akun. Fitur pemulihan email tidak dapat mengirim pesan jika SMTP belum dikonfigurasi. |
| `ADMIN_SEED_PASSWORD` | Kata sandi yang dipakai seeder admin lokal. Minimal 12 karakter. Nilai contoh hanya untuk database demo lokal. |

**Tidak ada `JWT_SECRET` atau `JWT_*` yang perlu diisi.** Aplikasi tidak memakai JWT: autentikasi menggunakan sesi server dan cookie aman. Jangan membuat atau memasukkan rahasia JWT yang tidak digunakan.

Jangan commit `.env`; berkas ini sudah diabaikan Git. `.env.example` berisi nilai contoh non-produksi.

## Instalasi dan Menjalankan Aplikasi

Jalankan semua perintah berikut dari direktori root proyek.

### 1. Bangun dan mulai layanan

Pastikan Docker Desktop aktif dan `.env` telah dibuat, lalu jalankan:

```powershell
docker compose up -d --build
```

Compose menjalankan tiga layanan:

| Layanan | Alamat host | Fungsi |
|---|---|---|
| `frontend` | <http://localhost:3000> | Antarmuka Next.js untuk browser. |
| `backend` | <http://localhost:3001> | API NestJS. Browser biasanya mengaksesnya melalui prefix same-origin `/api` pada frontend. |
| `db` | `localhost:5433` | PostgreSQL, dipublikasikan agar Prisma CLI di host dapat dipakai. |

Backend menunggu health check PostgreSQL, lalu menjalankan `npx prisma migrate deploy` sebelum memulai NestJS. Perintah ini menerapkan semua migrasi yang tersedia saat container dimulai. Volume `postgres_data` menyimpan data PostgreSQL, sedangkan bind mount `./uploads:/app/uploads` mempertahankan berkas upload lokal.

Periksa status container:

```powershell
docker compose ps
```

Pantau log jika layanan masih mulai:

```powershell
docker compose logs -f db backend frontend
```

### 2. Inisialisasi atau perbarui skema database

Pada penggunaan normal, migrasi otomatis dijalankan oleh command layanan backend. Untuk menerapkan ulang secara eksplisit setelah container siap:

```powershell
docker compose exec backend npx prisma migrate deploy
```

Jika mengembangkan perubahan skema Prisma, buat migrasi development dari komputer host (pastikan Node.js terpasang dan `DATABASE_URL` di `.env` menunjuk ke `localhost`):

```powershell
npm ci
npx prisma migrate dev --name nama_perubahan
npx prisma generate
```

Atau jalankan `migrate dev` dari container backend:

```powershell
docker compose exec backend npx prisma migrate dev --name nama_perubahan
```

Gunakan `migrate dev` untuk **pengembangan skema**, dan `migrate deploy` untuk menerapkan migrasi yang sudah ada. Jangan memakai `prisma db push` sebagai pengganti migrasi proyek ini.

Untuk mengisi taksonomi demo (fakultas, program studi, mata kuliah contoh), jalankan:

```powershell
docker compose exec backend npm run db:seed
```

Seeder taksonomi bersifat idempoten dan dapat dijalankan kembali setelah migrasi.

### 3. Buat akun Admin lokal

Seeder khusus admin mensyaratkan `ADMIN_SEED_PASSWORD` sepanjang 12–128 karakter dan menolak berjalan jika `NODE_ENV=production`. Untuk akun demo yang diminta:

```powershell
docker compose exec -e ADMIN_SEED_PASSWORD=adminpassword backend npm run db:seed:admin
```

Kredensial login lokal:

- Email: `admin@siapujian.local`
- Kata sandi: `adminpassword`

Ini adalah **kredensial demo lokal**, bukan kredensial produksi. Ganti kata sandi sebelum aplikasi dipublikasikan atau digunakan oleh orang lain. Seeder akan membuat atau memperbarui akun tersebut menjadi peran `ADMIN`.

### 4. Buka aplikasi

Setelah layanan sehat, buka <http://localhost:3000>. Untuk memeriksa API langsung, endpoint health tersedia di <http://localhost:3001/health>.

## Panduan Penggunaan Singkat

### 1. Masuk sebagai Admin

1. Jalankan seeder admin seperti pada bagian sebelumnya.
2. Buka <http://localhost:3000/login>.
3. Masuk menggunakan `admin@siapujian.local` dan `adminpassword`.
4. Setelah login, tautan **Moderasi** tersedia pada navigasi.

### 2. Unggah dokumen PDF sebagai pengguna

1. Daftarkan akun pengguna melalui **Daftar**, atau masuk dengan akun Kontributor yang sudah ada.
2. Buka **Unggah Soal** pada navigasi.
3. Pilih tab **Unggah PDF / Foto**.
4. Pilih fakultas, program studi, mata kuliah, topik RPS, jenis ujian, dan tahun ujian.
5. Pilih PDF soal (maksimal 15 MB). Tambahkan pembahasan tertulis atau PDF kunci jawaban.
6. Setujui pernyataan hak distribusi dan pastikan berkas bukan bocoran ujian aktif, lalu kirim untuk verifikasi.
7. Tanpa konfigurasi S3, berkas akan disimpan di folder lokal `uploads/`. Folder ini dipasang ke container sebagai volume sehingga isinya bertahan saat container dimulai ulang.

### 3. Verifikasi dokumen sebagai Admin

1. Masuk sebagai Admin.
2. Buka halaman **Moderasi**.
3. Tinjau metadata dan periksa dokumen yang dikirim.
4. Pilih tindakan **Setujui dan publikasikan** atau **Tolak kiriman**. Arsip yang menunggu moderasi tidak ditampilkan kepada publik.

### 4. Buka arsip yang disetujui dan gunakan diskusi

1. Buka **Eksplorasi Soal** dan cari mata kuliah atau topik.
2. Pilih arsip yang sudah **Terverifikasi**.
3. Gunakan **Buka dokumen soal** atau baca soal digital dan tab **Pembahasan**.
4. Buka tab **Diskusi Soal** untuk membaca komentar. Masuk untuk menulis tanggapan.
5. Kunjungan arsip terverifikasi dihitung untuk analytics, paling banyak satu kali per pengunjung per arsip dalam jendela 24 jam.

## Perintah Docker yang Berguna

```powershell
# Melihat status layanan
docker compose ps

# Mengikuti seluruh log
docker compose logs -f

# Mengikuti log satu layanan
docker compose logs -f backend

# Memulai layanan yang berhenti
docker compose start

# Menghentikan container tanpa menghapus data
docker compose stop

# Menghentikan dan menghapus container/jaringan; volume database tetap ada
docker compose down

# Membangun ulang image setelah perubahan kode
docker compose up -d --build
```

Untuk menghapus **seluruh data database demo** secara sengaja, jalankan `docker compose down -v`. Perintah ini destruktif untuk volume PostgreSQL; jangan jalankan jika ingin menyimpan data. Berkas pada `./uploads` adalah bind mount host dan tetap berada di folder tersebut.

## Menjalankan Tanpa Docker

Cara ini berguna untuk pengembangan frontend/backend dengan hot reload. PostgreSQL harus tetap tersedia di host atau dijalankan tersendiri di Docker.

1. Salin `.env.example` menjadi `.env`, dan pastikan `DATABASE_URL` menggunakan `localhost`.
2. Pasang dependensi dan buat Prisma Client:

   ```powershell
   npm ci
   npx prisma generate
   npx prisma migrate dev
   npm run db:seed
   ```

3. Jalankan backend dan frontend pada dua terminal PowerShell terpisah:

   ```powershell
   npm run api:dev
   ```

   ```powershell
   npm run dev
   ```

4. Untuk menggunakan fallback upload lokal, jalankan backend dengan `NODE_ENV=development`. Folder `uploads/` dibuat di working directory backend/proyek.
5. Untuk membuat Admin lokal, setel `ADMIN_SEED_PASSWORD` lalu jalankan `npm run db:seed:admin`:

   ```powershell
   $env:ADMIN_SEED_PASSWORD = "adminpassword"
   npm run db:seed:admin
   Remove-Item Env:ADMIN_SEED_PASSWORD
   ```

Di Windows, cookie sesi `Secure` memerlukan konteks yang mendukung cookie aman. Gunakan `localhost` untuk pengujian lokal, bukan alamat IP LAN melalui HTTP.

## Pemecahan Masalah

### Container backend tidak sehat atau gagal tersambung ke database

Periksa log dan status PostgreSQL:

```powershell
docker compose ps
docker compose logs db backend
```

Pastikan `POSTGRES_DB`, `POSTGRES_USER`, dan `POSTGRES_PASSWORD` tersedia pada `.env`. Untuk backend di jaringan Compose, database harus diakses lewat host `db`, bukan `localhost`. Compose membentuk URL internal tersebut otomatis.

### Migrasi gagal saat container mulai

Lihat detail log:

```powershell
docker compose logs backend
```

Pastikan container `db` berstatus sehat, lalu jalankan:

```powershell
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma migrate deploy
```

### Upload menampilkan pesan penyimpanan belum tersedia

Fallback disk hanya aktif saat `NODE_ENV=development`. Compose menetapkan mode tersebut untuk backend. Pastikan container berjalan dengan compose lokal dan mount `./uploads:/app/uploads` tidak dihapus atau diganti. Untuk mencoba S3, isi `AWS_S3_BUCKET`, pastikan region `ap-southeast-3`, serta berikan kredensial AWS dengan hak yang diperlukan.

### Port host sudah digunakan

Pesan seperti “port is already allocated” berarti ada proses lain yang memakai port 3000, 3001, atau 5433. Hentikan proses tersebut atau ubah sisi kiri pemetaan port di `docker-compose.yml`, misalnya `"3002:3000"` untuk frontend. Jika port PostgreSQL host diubah lewat `POSTGRES_HOST_PORT`, sesuaikan port pada `DATABASE_URL` untuk Prisma CLI lokal.

### Frontend tidak dapat menghubungi backend

Di dalam Docker, Next.js memakai `http://backend:3001` dan memanggil API melalui `/api`. Jangan ubah alamat internal ini menjadi `localhost`: di dalam container, `localhost` mengarah ke container itu sendiri. Browser mengakses frontend melalui `http://localhost:3000`.

### Berkas unggahan tetap ada setelah restart?

Berkas lokal berada di `./uploads/` pada host. Restart container atau `docker compose down` tidak menghapus bind mount tersebut. Hindari menghapus folder itu jika ingin mempertahankan dokumen demo.

## Catatan Keamanan

- Jangan memakai akun/kata sandi contoh untuk deployment publik.
- Jangan commit `.env`, kredensial database, kredensial AWS, atau kredensial SMTP.
- Compose ini ditujukan untuk **pengembangan dan demo lokal**, bukan konfigurasi produksi. PostgreSQL dipublikasikan ke host dan nilai default `.env.example` hanya untuk lokal.
- Untuk produksi, gunakan HTTPS, rahasia unik dari secret manager, database terkelola, bucket privat dengan least privilege, pemindaian berkas, backup, dan konfigurasi deployment yang ditinjau khusus.
- Backend menggunakan Argon2id dan sesi server berbasis cookie `HttpOnly`; aplikasi tidak menggunakan JWT atau menyimpan token autentikasi di `localStorage`.
