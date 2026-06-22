# Laporan Progress Project — SUKAFTI
**Sistem Informasi Survey Kerja Sama FTI Universitas Andalas**

## Ringkasan Eksekutif
Aplikasi SUKAFTI telah berhasil dikembangkan dengan arsitektur Node.js, Express, dan EJS, dipadukan dengan database MySQL. Aplikasi ini dirancang untuk memfasilitasi pengisian instrumen survei kerja sama antara Fakultas Teknologi Informasi dengan mitra industri maupun akademik.

Hingga saat ini (Minggu ke-14), fokus pengembangan telah menyelesaikan fitur-fitur utama core system, dan dilanjutkan dengan stabilisasi aplikasi menggunakan End-to-End Testing dengan kerangka kerja **Playwright**.

## Pencapaian Fitur Utama

Aplikasi telah memenuhi seluruh fitur dasar (MVP) sesuai dengan rancangan:

1. **Autentikasi & ACL (Role-Based)**
   - Login terpisah antara Administrator (berbasis akun) dan Mitra (berbasis OTP PIN).
   - Middleware keamanan ganda untuk memastikan hak akses pada dashboard admin maupun portal pengisian mitra.

2. **Manajemen Mitra & PIN Token**
   - CRUD (Create, Read, Update, Delete) Data Mitra.
   - Generator Token PIN 6-digit untuk setiap mitra agar dapat mengakses survei secara unik.
   - Pelacakan status penggunaan PIN (Burn-after-use logic).

3. **Manajemen Instrumen Kuesioner**
   - Pembuatan pertanyaan kuesioner dinamis.
   - Dukungan tiga tipe pertanyaan:
     - Teks Deskriptif (Essay)
     - Pilihan Ganda (Multiple Choice)
     - Skala Penilaian (Rating 1-5)
   - Bobot poin/skor otomatis pada opsi jawaban pilihan ganda/rating.

4. **Portal Pengisian Survei (Client-side)**
   - Antarmuka pengisian survei interaktif menggunakan Basecoat CSS.
   - Sistem auto-fokus dan validasi interaktif.
   - Proteksi terhadap penggunaan ulang PIN yang sama.

5. **Rekapitulasi Hasil Survei**
   - Dashboard Admin dengan statistik data.
   - Tabel respons survei masuk yang mencakup skor total mitra.
   - Export laporan survei.

## Pengujian End-to-End (E2E)

Pada Minggu ke-14, telah diimplementasikan **Playwright Test Suite** untuk memastikan fitur-fitur di atas berjalan sesuai spesifikasi tanpa regresi.

Cakupan Test Suite:
- `auth.spec.js`: Skenario login Admin sukses/gagal, validasi OTP login Mitra, dan alur Logout.
- `dashboard.spec.js`: Validasi tampilan metrik dashboard, tabel data, dan popup Generate PIN.
- `questions.spec.js`: Pengujian CRUD antarmuka kuesioner, validasi tipe jawaban spesifik.
- `partners.spec.js`: Pengujian antarmuka list mitra, filter pencarian, dan dialog data baru.
- `survey-mitra.spec.js`: Simulasi pengisian input PIN (OTP UI) dan penolakan jika invalid.
- `recap.spec.js`: Pengujian antarmuka hasil laporan.

## Kesimpulan & Langkah Selanjutnya
Aplikasi dalam tahap yang sangat stabil dan memenuhi *requirements* inti proyek. Langkah selanjutnya untuk fase *deployment* (jika ada):
- Penyempurnaan responsivitas perangkat *mobile* secara menyeluruh.
- Pembersihan *codebase* dan penyusunan dokumentasi instalasi.
- *Performance tuning* pada query database (indeksasi tambahan).
