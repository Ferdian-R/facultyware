const mysql = require("mysql2/promise");
require("dotenv").config();
const crypto = require("crypto");

async function seed() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'facultyware'
    });

    console.log("Memulai penambahan data dummy penuh...");

    // 1. Bersihkan tabel (Hati-hati, ini akan menghapus data survey!)
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("TRUNCATE TABLE survey_answer_options");
    await db.query("TRUNCATE TABLE survey_answers");
    await db.query("TRUNCATE TABLE survey_responses");
    await db.query("TRUNCATE TABLE survey_invitations");
    await db.query("TRUNCATE TABLE survey_question_options");
    await db.query("TRUNCATE TABLE survey_question_assignments");
    await db.query("TRUNCATE TABLE survey_questions");
    await db.query("TRUNCATE TABLE surveys");
    await db.query("TRUNCATE TABLE partners");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    // 2. Insert Partners
    console.log("Membuat Data Mitra...");
    const partnersData = [
      { name: "PT Telkom Indonesia", type: "company", address: "Jakarta", email: "contact@telkom.co.id", phone: "021-111111" },
      { name: "Bank Mandiri (Persero)", type: "company", address: "Jakarta", email: "info@bankmandiri.co.id", phone: "021-222222" },
      { name: "Kementerian Kominfo", type: "government", address: "Jakarta Pusat", email: "admin@kominfo.go.id", phone: "021-333333" },
      { name: "PT Gojek Tokopedia (GoTo)", type: "company", address: "Jakarta Selatan", email: "partner@goto.com", phone: "021-444444" },
      { name: "Dinas Pendidikan Provinsi", type: "government", address: "Bandung", email: "disdik@jabarprov.go.id", phone: "022-555555" }
    ];

    for (let i = 0; i < partnersData.length; i++) {
      const p = partnersData[i];
      const [res] = await db.query(
        "INSERT INTO partners (name, type, address, email, phone) VALUES (?, ?, ?, ?, ?)",
        [p.name, p.type, p.address, p.email, p.phone]
      );
      partnersData[i].id = res.insertId;
    }

    // 3. Insert Survey
    console.log("Membuat Kuesioner...");
    const [surveyResult] = await db.query(
      `INSERT INTO surveys (title, description, start_date, end_date, is_active, created_by, employee_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["Evaluasi Program Kerjasama FTI 2026", "Survei komprehensif terkait pelaksanaan program kerjasama (Magang, Riset, dll) antara Fakultas Teknologi Informasi dan Mitra Industri.", "2026-01-01", "2026-12-31", 1, 1, 1]
    );
    const surveyId = surveyResult.insertId;

    // 4. Insert 5 Questions with different formats
    console.log("Membuat 5 Pertanyaan Berbeda Format...");
    const questionsData = [
      {
        text: "Secara keseluruhan, bagaimana tingkat kepuasan Anda terhadap program Kerjasama (Magang/Riset) dengan Fakultas Teknologi Informasi?",
        type: "single_choice",
        options: [
          { text: "Sangat Buruk", weight: 1 },
          { text: "Buruk", weight: 2 },
          { text: "Cukup", weight: 3 },
          { text: "Baik", weight: 4 },
          { text: "Sangat Baik", weight: 5 }
        ]
      },
      {
        text: "Bentuk kerjasama apa yang menurut Anda paling bermanfaat bagi perusahaan/instansi Anda?",
        type: "multiple_choice",
        options: [
          { text: "Magang / Kerja Praktek Mahasiswa", weight: 5 },
          { text: "Rekrutmen Lulusan (Campus Hiring)", weight: 4 },
          { text: "Penelitian Bersama (Joint Research)", weight: 4 },
          { text: "Pelatihan / Sertifikasi", weight: 3 }
        ]
      },
      {
        text: "Kelemahan utama apa yang perlu ditingkatkan dari mahasiswa/lulusan kami selama pelaksanaan kerjasama?",
        type: "single_choice",
        options: [
          { text: "Penguasaan Teknis (Hardskill)", weight: 2 },
          { text: "Etika Kerja & Komunikasi (Softskill)", weight: 1 },
          { text: "Inisiatif & Kreativitas", weight: 2 },
          { text: "Keterampilan Berbahasa Asing", weight: 3 },
          { text: "Tidak ada kelemahan yang signifikan", weight: 5 }
        ]
      },
      {
        text: "Apakah Anda bermaksud untuk melanjutkan atau memperluas kerjasama ini di tahun depan?",
        type: "single_choice",
        options: [
          { text: "Ya, pasti", weight: 5 },
          { text: "Ya, mungkin", weight: 4 },
          { text: "Belum Tahu", weight: 2 },
          { text: "Tidak", weight: 1 }
        ]
      },
      {
        text: "Mohon berikan saran atau masukan Anda terkait program kerjasama ke depan agar dapat saling menguntungkan:",
        type: "short_answer",
        options: [] // Short answer tidak memiliki options
      }
    ];

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      const [qResult] = await db.query(
        "INSERT INTO survey_questions (question_text, type, is_active) VALUES (?, ?, 1)",
        [q.text, q.type]
      );
      q.id = qResult.insertId;

      await db.query(
        "INSERT INTO survey_question_assignments (survey_id, survey_question_id, `order`) VALUES (?, ?, ?)",
        [surveyId, q.id, i + 1]
      );

      if (q.options.length > 0) {
        for (const opt of q.options) {
          const [optResult] = await db.query(
            "INSERT INTO survey_question_options (survey_question_id, option_text, weight) VALUES (?, ?, ?)",
            [q.id, opt.text, opt.weight]
          );
          opt.id = optResult.insertId;
        }
      }
    }

    // 5. Generate PIN & Responses
    console.log("Membuat Undangan (PIN) dan Data Hasil Survei (Respons)...");
    for (let i = 0; i < partnersData.length; i++) {
      const partner = partnersData[i];
      const pin = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
      
      // Semua mitra dibuat sudah mengisi survei (is_used = 1) kecuali mitra terakhir
      const isFilled = i < 4; 
      
      const [invResult] = await db.query(
        "INSERT INTO survey_invitations (survey_id, name, email, phone, pin, is_used) VALUES (?, ?, ?, ?, ?, ?)",
        [surveyId, partner.name, partner.email, partner.phone, pin, isFilled ? 1 : 0]
      );
      const invitationId = invResult.insertId;
      console.log(`Mitra: ${partner.name} | PIN: ${pin} | Status: ${isFilled ? "Sudah Mengisi" : "Belum Mengisi"}`);

      if (isFilled) {
        // Buat Survey Response
        const [respResult] = await db.query(
          "INSERT INTO survey_responses (survey_id, survey_invitation_id, submitted_at) VALUES (?, ?, NOW())",
          [surveyId, invitationId]
        );
        const responseId = respResult.insertId;

        // Buat Jawaban (Answers)
        for (const q of questionsData) {
          let answerText = null;
          let selectedOption = null;

          if (q.type === 'short_answer') {
            const essayAnswers = [
              "Program magang sudah sangat baik, namun durasinya mungkin bisa diperpanjang menjadi 6 bulan agar mahasiswa lebih mendalami project.",
              "Perlu adanya lebih banyak joint-research antara dosen dan tim R&D kami.",
              "Mohon proses administrasi MoU dapat dipercepat di masa mendatang.",
              "Kami berharap ada lebih banyak kandidat dari prodi Sistem Informasi untuk campus hiring tahun depan."
            ];
            answerText = essayAnswers[i % essayAnswers.length];
          } else {
            // Pilih secara random salah satu opsi
            const randIdx = Math.floor(Math.random() * q.options.length);
            selectedOption = q.options[randIdx];
          }

          const [ansResult] = await db.query(
            "INSERT INTO survey_answers (survey_response_id, survey_question_id, answer_text) VALUES (?, ?, ?)",
            [responseId, q.id, answerText]
          );
          const answerId = ansResult.insertId;

          if (selectedOption) {
            await db.query(
              "INSERT INTO survey_answer_options (survey_answer_id, survey_question_option_id) VALUES (?, ?)",
              [answerId, selectedOption.id]
            );
          }
        }
      }
    }

    console.log("BERHASIL! Data dummy komprehensif sudah dimasukkan ke database.");
    db.end();
  } catch (err) {
    console.error("Gagal melakukan seeding:", err);
    process.exit(1);
  }
}

seed();
