# Facultyware - Central Panel 🏢

Aplikasi web manajemen survei kerjasama dan kemitraan Fakultas Teknologi Informasi (FTI) dengan pihak eksternal. Proyek ini dikembangkan menggunakan arsitektur *Client-Server* dengan Node.js (ExpressJS) dan MariaDB/MySQL (menggunakan `mysql2` *native* tanpa ORM).

## 🚀 Fitur Utama
Sistem ini menyediakan portal untuk:
- Manajemen Instrumen Pertanyaan Survei
- Manajemen Data Mitra Kandidat Kerjasama
- Pembuatan dan Validasi PIN Akses Survei
- Pengisian Survei oleh Mitra
- Rekapitulasi & Visualisasi Jawaban Survei
- Export Laporan (PDF & Excel)
- REST API Terintegrasi (JSON)

## 👥 Pembagian Tugas Kelompok
1. **Ferdian Rahman (2411522004)** 
   - Laporan Dashboard (PDF)
   - Manajemen PIN Akses & Log Aktivitas (REST API & UI)
2. **Madani Fitri Nur Hidayati (2411521005)**
   - Detail Mitra (PDF)
   - Profil dan Data Mitra Kandidat (REST API & UI)
3. **Febiola Ramli (2411521008)**
   - Daftar Pertanyaan Survei (PDF)
   - Instrumen Pertanyaan Survei (REST API & UI)
4. **Adinda Queen Salsabilla (2411522008)**
   - Rekap Jawaban Mitra (Excel)
   - Jawaban Hasil Survei Mitra (REST API & UI)

## ⚙️ Persyaratan Sistem
- **Node.js** (Versi 18 atau lebih baru)
- **MySQL / MariaDB** Server

## 🛠️ Cara Instalasi dan Menjalankan Aplikasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/Ferdian-R/facultyware.git
   cd facultyware
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   - Salin file `.env.example` menjadi `.env`
   - Sesuaikan kredensial *database* di dalam file `.env`:
     ```env
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=facultyware
     ```

4. **Siapkan Database (Seeding)**
   Jalankan file SQL skema V2 (jika belum ada database) lalu masukkan data awal (Admin & Dummy Data):
   ```bash
   node scripts/setup_admin.js
   node scripts/seed_initial.js
   node scripts/seed_dummy.js
   ```

5. **Jalankan Aplikasi**
   Untuk mode *Development*:
   ```bash
   npm run dev
   ```
   Untuk mode *Production*:
   ```bash
   npm start
   ```
   Aplikasi dapat diakses di browser melalui `http://localhost:3000`

## 📹 Video Demo
*Tambahkan link YouTube video demo di sini*
- **URL Video:** [Masukkan Link YouTube]

## 🧪 Testing (Playwright)
Testing E2E dapat dijalankan menggunakan Playwright:
```bash
npm run test
npm run test:report
```
