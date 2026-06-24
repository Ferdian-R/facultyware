const mysql = require("mysql2/promise");
require("dotenv").config();

async function seed() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'facultyware',
      port: process.env.DB_PORT || process.env.MYSQLPORT || 3306
    });

    console.log("Starting database seeding...");

    // 1. Seed Partners
    const [partners] = await db.query("SELECT * FROM partners LIMIT 1");
    if (partners.length === 0) {
      const samplePartners = [
        {
          name: "PT Semen Padang",
          type: "company",
          address: "Indarung, Padang, Sumatera Barat",
          email: "info@semenpadang.co.id",
          phone: "0751-815111",
          description: "BUMN produsen semen tertua di Indonesia"
        },
        {
          name: "Dinas Kominfo Provinsi Sumatera Barat",
          type: "government",
          address: "Jl. Pramuka Raya No.11, Padang",
          email: "diskominfotik@sumbarprov.go.id",
          phone: "0751-890222",
          description: "Lembaga pemerintahan daerah."
        }
      ];

      for (const p of samplePartners) {
        await db.query(
          `INSERT INTO partners (name, type, address, email, phone, description) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [p.name, p.type, p.address, p.email, p.phone, p.description]
        );
        console.log(`Created Partner: ${p.name}`);
      }
    }

    // 2. Seed Survey
    const [surveys] = await db.query("SELECT * FROM surveys LIMIT 1");
    let surveyId;
    if (surveys.length === 0) {
      const [surveyResult] = await db.query(
        `INSERT INTO surveys (title, description, start_date, end_date, is_active, created_by, employee_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["Survei Kepuasan Mitra FTI 2026", "Survei untuk mengevaluasi kepuasan mitra terhadap kualitas lulusan dan layanan kerjasama Fakultas Teknologi Informasi.", "2026-01-01", "2026-12-31", 1, 1, 1]
      );
      surveyId = surveyResult.insertId;
      console.log(`Created Survey (ID: ${surveyId})`);
    } else {
      surveyId = surveys[0].id;
    }

    // 3. Seed Survey Questions
    const [questions] = await db.query("SELECT * FROM survey_questions LIMIT 1");
    if (questions.length === 0) {
      const questionsData = [
        {
          text: "Bagaimana tingkat kepuasan Anda terhadap kompetensi teknis (hardskill) lulusan FTI?",
          type: "single_choice",
          options: [
            { text: "Sangat Puas", weight: 4 },
            { text: "Puas", weight: 3 },
            { text: "Cukup", weight: 2 },
            { text: "Kurang", weight: 1 }
          ]
        },
        {
          text: "Bagaimana penilaian Anda terhadap kemampuan komunikasi dan kerjasama tim (softskill) lulusan?",
          type: "single_choice",
          options: [
            { text: "Sangat Baik", weight: 4 },
            { text: "Baik", weight: 3 },
            { text: "Cukup", weight: 2 },
            { text: "Kurang", weight: 1 }
          ]
        },
        {
          text: "Apakah ada saran terkait teknologi atau kurikulum yang perlu ditambahkan di FTI?",
          type: "short_answer",
          options: []
        }
      ];

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        const [qResult] = await db.query(
          "INSERT INTO survey_questions (question_text, type, is_active) VALUES (?, ?, 1)",
          [q.text, q.type]
        );
        const qId = qResult.insertId;

        // Assign to survey
        await db.query(
          "INSERT INTO survey_question_assignments (survey_id, survey_question_id, `order`) VALUES (?, ?, ?)",
          [surveyId, qId, i + 1]
        );

        // Add options if any
        if (q.options.length > 0) {
          for (const opt of q.options) {
            await db.query(
              "INSERT INTO survey_question_options (survey_question_id, option_text, weight) VALUES (?, ?, ?)",
              [qId, opt.text, opt.weight]
            );
          }
        }
        console.log(`Created Question: ${q.text.substring(0, 30)}...`);
      }
    }

    // 4. Seed Invitations
    const [invitations] = await db.query("SELECT * FROM survey_invitations LIMIT 1");
    if (invitations.length === 0) {
      await db.query(
        "INSERT INTO survey_invitations (survey_id, name, email, phone, pin, is_used) VALUES (?, ?, ?, ?, ?, 0)",
        [surveyId, "PT Semen Padang", "info@semenpadang.co.id", "0751-815111", "FTI26A"]
      );
      console.log("Generated default Invitation PIN: FTI26A");
    }

    console.log("Database seeding complete!");
    db.end();
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exit(1);
  }
}

seed();
