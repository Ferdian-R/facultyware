const db = require("../config/db");

async function seed() {
  try {
    console.log("Starting survey database seeding...");

    // 1. Check if a survey already exists
    const [surveys] = await db.query("SELECT * FROM surveys LIMIT 1");
    let surveyId;

    if (surveys.length === 0) {
      // Create default survey
      const [insertSurvey] = await db.query(
        "INSERT INTO surveys (title, description, status) VALUES (?, ?, ?)",
        [
          "Survey Kepuasan Mitra Kerja Sama FTI Universitas Andalas",
          "Survey ini bertujuan untuk mengukur indeks kepuasan mitra industri, instansi pemerintah, dan lembaga mitra lainnya terhadap layanan dan kerja sama dengan Fakultas Teknologi Informasi Universitas Andalas.",
          "published"
        ]
      );
      surveyId = insertSurvey.insertId;
      console.log(`Default survey created with ID: ${surveyId}`);
    } else {
      surveyId = surveys[0].id;
      console.log(`Survey already exists with ID: ${surveyId}. Skipping survey creation.`);
    }

    // 2. Check if questions exist for this survey
    const [questions] = await db.query("SELECT * FROM survey_questions WHERE survey_id = ?", [surveyId]);
    if (questions.length === 0) {
      console.log("Seeding sample questions...");

      // Question 1: Rating
      const [q1] = await db.query(
        "INSERT INTO survey_questions (survey_id, question_text, type, order_number) VALUES (?, ?, 'rating', 1)",
        [surveyId, "Bagaimana penilaian Anda terhadap kompetensi lulusan FTI yang bekerja di instansi/perusahaan Anda?"]
      );
      const q1Id = q1.insertId;
      const q1Options = [
        ["Sangat Kurang", 1],
        ["Kurang", 2],
        ["Cukup", 3],
        ["Baik", 4],
        ["Sangat Baik", 5]
      ];
      for (const opt of q1Options) {
        await db.query(
          "INSERT INTO survey_question_options (survey_question_id, option_text, score) VALUES (?, ?, ?)",
          [q1Id, opt[0], opt[1]]
        );
      }

      // Question 2: Rating
      const [q2] = await db.query(
        "INSERT INTO survey_questions (survey_id, question_text, type, order_number) VALUES (?, ?, 'rating', 2)",
        [surveyId, "Bagaimana tingkat kepuasan Anda terhadap komunikasi dan respon pihak FTI dalam pelaksanaan kerja sama?"]
      );
      const q2Id = q2.insertId;
      const q2Options = [
        ["Sangat Tidak Puas", 1],
        ["Tidak Puas", 2],
        ["Cukup Puas", 3],
        ["Puas", 4],
        ["Sangat Puas", 5]
      ];
      for (const opt of q2Options) {
        await db.query(
          "INSERT INTO survey_question_options (survey_question_id, option_text, score) VALUES (?, ?, ?)",
          [q2Id, opt[0], opt[1]]
        );
      }

      // Question 3: Multiple Choice
      const [q3] = await db.query(
        "INSERT INTO survey_questions (survey_id, question_text, type, order_number) VALUES (?, ?, 'multiple_choice', 3)",
        [surveyId, "Apakah instansi/perusahaan Anda berminat untuk melanjutkan atau memperluas kerja sama dengan FTI di masa mendatang?"]
      );
      const q3Id = q3.insertId;
      const q3Options = [
        ["Ya, berminat", 10],
        ["Mungkin / Pikir-pikir dulu", 5],
        ["Tidak berminat", 0]
      ];
      for (const opt of q3Options) {
        await db.query(
          "INSERT INTO survey_question_options (survey_question_id, option_text, score) VALUES (?, ?, ?)",
          [q3Id, opt[0], opt[1]]
        );
      }

      // Question 4: Essay
      await db.query(
        "INSERT INTO survey_questions (survey_id, question_text, type, order_number) VALUES (?, ?, 'essay', 4)",
        [surveyId, "Tuliskan saran atau masukan Anda untuk peningkatan program studi atau peningkatan kualitas kerja sama FTI Universitas Andalas."]
      );

      console.log("Sample questions and options successfully seeded!");
    } else {
      console.log("Questions already exist. Skipping questions seeding.");
    }

    console.log("Seeding survey complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding survey database:", err);
    process.exit(1);
  }
}

seed();
