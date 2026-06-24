# Facultyware - Sistem Survei Kepuasan Mitra FTI 🏢🚀

Aplikasi web terintegrasi untuk manajemen survei kerjasama dan kemitraan Fakultas Teknologi Informasi (FTI) Universitas Andalas dengan pihak eksternal/industri. Proyek ini dikembangkan menggunakan arsitektur *Client-Server* modern.

**Tautan Akses Server Production (Live):**
👉 [https://facultyware-production.up.railway.app](https://facultyware-production.up.railway.app)

---

## 🎯 Tujuan Sistem
Sistem ini dirancang untuk mendigitalisasi proses pengumpulan *feedback* dari mitra industri terkait kepuasan kerjasama dan kualitas lulusan FTI. Sistem menjamin keamanan data dengan menggunakan token/PIN unik (*One-Time Use*) untuk setiap pengisian kuesioner oleh mitra.

## 🚀 Fitur & Fungsionalitas Utama
- **Manajemen Mitra & PIN Akses:** Pembuatan, pembaruan, dan pembuatan Token PIN 6 karakter unik untuk mitra.
- **Kuesioner Dinamis:** Mendukung berbagai jenis pertanyaan (Pilihan Ganda, Skala Rating, Isian Singkat, Essay).
- **Portal Publik (Frontend):** Antarmuka khusus bagi mitra untuk memasukkan PIN dan mengisi kuesioner dengan mulus tanpa login akun.
- **Dashboard Admin (Backend):** Panel kontrol untuk memantau aktivitas survei, *completion rate*, dan validasi data.
- **Laporan & Export:** Cetak hasil survei dan rekapan jawaban dalam bentuk **PDF** (menggunakan Puppeteer) dan **Excel** (menggunakan ExcelJS).
- **Keamanan (ACL & Auth):** Dilengkapi sistem *Role-Based Access Control* (RBAC), enkripsi *password* menggunakan `bcrypt`, serta proteksi akses *middleware*.

---

## 👥 Tim Pengembang (Pembagian Tugas)
1. **Ferdian Rahman (2411522004)** 
   - Modul: Manajemen PIN Akses & Log Aktivitas (REST API & UI)
   - Laporan: *Generate* Laporan Dashboard (PDF)
2. **Madani Fitri Nur Hidayati (2411521005)**
   - Modul: Profil dan Manajemen Data Mitra Kandidat (REST API & UI)
   - Laporan: *Generate* Detail Rekap Mitra (PDF)
3. **Febiola Ramli (2411521008)**
   - Modul: Manajemen Instrumen Pertanyaan Survei (REST API & UI)
   - Laporan: *Generate* Daftar Pertanyaan Survei (PDF)
4. **Adinda Queen Salsabilla (2411522008)**
   - Modul: Pencatatan Jawaban Hasil Survei Mitra (REST API & UI)
   - Laporan: *Export* Rekap Jawaban Mitra (Excel)

---

## 💻 Teknologi & Arsitektur (Tech Stack)
- **Backend Framework:** Node.js + Express.js
- **Database:** MariaDB / MySQL (menggunakan `mysql2` *native driver* tanpa ORM)
- **Template Engine:** EJS (Embedded JavaScript)
- **Styling:** Tailwind CSS + Vanilla JS (via *Basecoat UI*)
- **Interactivity:** HTMX (Untuk navigasi SPA-like & *partial DOM updates* tanpa memuat ulang halaman penuh)
- **Testing:** Playwright (Untuk *End-to-End Automated Testing*)
- **Deployment:** Railway.app

---

## 🛠️ Panduan Instalasi (Development)

### 1. Persyaratan Sistem
- **Node.js** (Versi 18 LTS atau lebih baru)
- **MySQL / MariaDB** Server (XAMPP / Laragon / Docker)
- **Git**

### 2. Clone & Install
```bash
git clone https://github.com/Ferdian-R/facultyware.git
cd facultyware
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env` dan atur konfigurasi databasenya:
```env
# Server & App Config
PORT=3000
NODE_ENV=development
SESSION_SECRET=facultyware_secure_secret_key_2026

# Database Connection
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=facultyware_db
```

### 4. Setup Database & Seeding (Otomatis)
Aplikasi ini dilengkapi *script automation* untuk menginisialisasi tabel skema database dan mengisi data *dummy* secara langsung. Jalankan perintah berikut secara berurutan:
```bash
# 1. Menyiapkan tabel, peran (Roles), hak akses (Permissions), dan akun Admin Utama
node scripts/setup_admin.js

# 2. Mengisi instrumen kuesioner bawaan V2 (Sesuai spesifikasi FTI)
node scripts/seed_initial.js

# 3. Mengisi data sampel mitra untuk keperluan testing
node scripts/seed_dummy.js
```

### 5. Menjalankan Aplikasi Server
```bash
# Untuk mode pengembangan dengan Auto-reload (Nodemon)
npm run dev

# Untuk mode produksi
npm start
```
Aplikasi dapat diakses di browser melalui `http://localhost:3000`

---

## 🔐 Kredensial Akses Default (Testing)
Setelah menjalankan `setup_admin.js`, Anda dapat *login* ke panel Dashboard menggunakan akun berikut:
- **Email:** `admin@fti.unand.ac.id`
- **Password:** `admin123`

Untuk *testing* pengisian survei di Portal Publik, gunakan PIN *dummy* yang dapat dilihat pada menu "Manajemen Mitra" di dalam Dashboard Admin.

---

## 🧪 Testing Automasi (Playwright)
Proyek ini memiliki *End-to-End Testing Script* untuk memastikan fungsionalitas berjalan lancar tanpa intervensi manual.
```bash
# Menjalankan seluruh test (headless mode)
npm run test

# Melihat hasil rekaman / report HTML dari pengujian
npm run test:report
```

---
## 📹 Video Demonstrasi
*Tambahkan link YouTube video presentasi/demo proyek di sini*
- **URL Video:** [Link YouTube Segera Hadir]
