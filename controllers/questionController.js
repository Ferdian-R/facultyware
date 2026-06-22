const db = require("../config/db");
const { validationResult } = require("express-validator");
const pdfService = require("../services/pdfService");

/**
 * Helper to normalize single value / array into array
 */
const toArray = (val) => {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
};

/**
 * Auto-resequence question numbers for a survey to make sure they are ordered 1, 2, 3, 4... without gaps or duplicates
 */
const resequenceQuestions = async (surveyId, connOrDb) => {
  const [assignments] = await connOrDb.query(
    "SELECT id FROM survey_question_assignments WHERE survey_id = ? ORDER BY `order` ASC, id ASC",
    [surveyId]
  );
  for (let i = 0; i < assignments.length; i++) {
    await connOrDb.query(
      "UPDATE survey_question_assignments SET `order` = ? WHERE id = ?",
      [i + 1, assignments[i].id]
    );
  }
};

/**
 * Renders the question management page
 */
const showQuestionsPage = async (req, res, next) => {
  try {
    // 1. Fetch all surveys
    const [surveys] = await db.query("SELECT id, title, description, is_active AS status FROM surveys ORDER BY id DESC");
    
    if (surveys.length === 0) {
      // If no surveys exist, render with empty state
      return res.render("dashboard/questions", {
        title: "Manajemen Pertanyaan | SUKAFTI",
        user: req.session.username || "Admin FTI",
        surveys: [],
        selectedSurveyId: null,
        questions: [],
        error: "Tidak ada survey aktif di database. Silakan jalankan seeder terlebih dahulu.",
        success: null
      });
    }

    // 2. Determine selected survey
    let selectedSurveyId = parseInt(req.query.survey_id) || surveys[0].id;
    
    // Double check if selectedSurveyId exists in the list
    const surveyExists = surveys.some(s => s.id === selectedSurveyId);
    if (!surveyExists) {
      selectedSurveyId = surveys[0].id;
    }

    // Automatically re-sequence order numbers to clean up duplicates/gaps
    await resequenceQuestions(selectedSurveyId, db);

    // 3. Fetch questions for the selected survey
    const [questions] = await db.query(
      `SELECT sq.id, sq.question_text, sq.type, sqa.order AS order_number 
       FROM survey_questions sq 
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id 
       WHERE sqa.survey_id = ? 
       ORDER BY sqa.order ASC`,
      [selectedSurveyId]
    );

    // 4. Fetch options for all questions in this survey
    const [options] = await db.query(
      `SELECT sqo.id, sqo.survey_question_id, sqo.option_text, sqo.weight AS score 
       FROM survey_question_options sqo
       JOIN survey_question_assignments sqa ON sqo.survey_question_id = sqa.survey_question_id
       WHERE sqa.survey_id = ?
       ORDER BY sqo.id ASC`,
      [selectedSurveyId]
    );

    // Map options to their respective questions
    const questionsWithOptions = questions.map(q => {
      return {
        ...q,
        options: options.filter(opt => opt.survey_question_id === q.id)
      };
    });

    res.render("dashboard/questions", {
      title: "Manajemen Pertanyaan | SUKAFTI",
      user: req.session.username || "Admin FTI",
      surveys,
      selectedSurveyId,
      questions: questionsWithOptions,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle form submission to create a new question (Web UI)
 */
const createQuestion = async (req, res, next) => {
  const { survey_id, question_text, type } = req.body;
  const optionTexts = toArray(req.body.option_text);
  const optionScores = toArray(req.body.option_score);

  if (!survey_id || !question_text || !type) {
    return res.redirect(`/admin/questions?survey_id=${survey_id}&error=Data+input+tidak+lengkap.`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert question
    const [qResult] = await conn.query(
      "INSERT INTO survey_questions (question_text, type, is_active) VALUES (?, ?, 1)",
      [question_text, type]
    );
    const questionId = qResult.insertId;

    // 2. Assign to survey with order = 9999
    await conn.query(
      "INSERT INTO survey_question_assignments (survey_id, survey_question_id, `order`) VALUES (?, ?, 9999)",
      [survey_id, questionId]
    );

    // 3. Insert options if type is multiple_choice or rating (mapped to single_choice or multiple_choice)
    if ((type === "multiple_choice" || type === "single_choice" || type === "rating") && optionTexts.length > 0) {
      for (let i = 0; i < optionTexts.length; i++) {
        const text = optionTexts[i]?.trim();
        const score = parseFloat(optionScores[i]) || 0;
        if (text) {
          await conn.query(
            "INSERT INTO survey_question_options (survey_question_id, option_text, weight) VALUES (?, ?, ?)",
            [questionId, text, score]
          );
        }
      }
    }

    // 4. Resequence questions to ensure correct continuous numbering
    await resequenceQuestions(survey_id, conn);

    await conn.commit();
    res.redirect(`/admin/questions?survey_id=${survey_id}&success=Pertanyaan+berhasil+ditambahkan.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * Handle form submission to update an existing question (Web UI)
 */
const updateQuestion = async (req, res, next) => {
  const { id } = req.params;
  const { survey_id, question_text, type } = req.body;
  const optionTexts = toArray(req.body.option_text);
  const optionScores = toArray(req.body.option_score);

  if (!survey_id || !question_text || !type) {
    return res.redirect(`/admin/questions?survey_id=${survey_id}&error=Data+input+tidak+lengkap.`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update question
    await conn.query(
      "UPDATE survey_questions SET question_text = ?, type = ? WHERE id = ?",
      [question_text, type, id]
    );

    // 2. Delete existing options
    await conn.query("DELETE FROM survey_question_options WHERE survey_question_id = ?", [id]);

    // 3. Insert new options if type is multiple_choice or rating
    if ((type === "multiple_choice" || type === "single_choice" || type === "rating") && optionTexts.length > 0) {
      for (let i = 0; i < optionTexts.length; i++) {
        const text = optionTexts[i]?.trim();
        const score = parseFloat(optionScores[i]) || 0;
        if (text) {
          await conn.query(
            "INSERT INTO survey_question_options (survey_question_id, option_text, weight) VALUES (?, ?, ?)",
            [id, text, score]
          );
        }
      }
    }

    // 4. Resequence questions to ensure correct continuous numbering
    await resequenceQuestions(survey_id, conn);

    await conn.commit();
    res.redirect(`/admin/questions?survey_id=${survey_id}&success=Pertanyaan+berhasil+diperbarui.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * Handle request to delete a question (Web UI & HTMX)
 */
const deleteQuestion = async (req, res, next) => {
  const { id } = req.params;
  const surveyIdParam = req.query.survey_id || req.body.survey_id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get the question's survey_id
    const [[assignment]] = await conn.query(
      "SELECT survey_id FROM survey_question_assignments WHERE survey_question_id = ? LIMIT 1",
      [id]
    );

    if (!assignment) {
      await conn.rollback();
      if (req.xhr || req.headers["hx-request"]) {
        return res.status(404).json({ success: false, message: "Pertanyaan tidak ditemukan." });
      }
      return res.redirect(`/admin/questions?survey_id=${surveyIdParam}&error=Pertanyaan+tidak+ditemukan.`);
    }

    const surveyId = assignment.survey_id;

    // 2. Delete the question (assignments and options cascade delete)
    await conn.query("DELETE FROM survey_questions WHERE id = ?", [id]);

    // 3. Resequence questions to ensure correct continuous numbering
    await resequenceQuestions(surveyId, conn);

    await conn.commit();

    if (req.xhr || req.headers["hx-request"]) {
      return res.status(200).send("");
    }

    res.redirect(`/admin/questions?survey_id=${surveyId}&success=Pertanyaan+berhasil+dihapus.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * JSON API: Fetch all questions
 * GET /api/questions
 */
const apiGetQuestions = async (req, res, next) => {
  try {
    const surveyId = parseInt(req.query.survey_id);
    let query = `SELECT sq.id, sqa.survey_id, sq.question_text, sq.type, sqa.order AS order_number 
                 FROM survey_questions sq 
                 JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id`;
    let params = [];

    if (surveyId) {
      query += " WHERE sqa.survey_id = ?";
      params.push(surveyId);
    }
    query += " ORDER BY sqa.order ASC, sq.id ASC";

    const [questions] = await db.query(query, params);

    // Fetch options for these questions
    let optionsQuery = "SELECT id, survey_question_id, option_text, weight AS score FROM survey_question_options ORDER BY id ASC";
    const [options] = await db.query(optionsQuery);

    const data = questions.map(q => {
      return {
        id: q.id,
        survey_id: q.survey_id,
        question_text: q.question_text,
        type: q.type,
        order_number: q.order_number,
        options: options.filter(opt => opt.survey_question_id === q.id).map(opt => ({
          id: opt.id,
          option_text: opt.option_text,
          score: opt.score
        }))
      };
    });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * JSON API: Create a new question
 * POST /api/questions
 */
const apiCreateQuestion = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { survey_id, question_text, type, order_number, options } = req.body;

  // Verify survey exists
  try {
    const [[survey]] = await db.query("SELECT id FROM surveys WHERE id = ?", [survey_id]);
    if (!survey) {
      return res.status(404).json({ success: false, message: "Survey not found." });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert question
    const [qResult] = await conn.query(
      "INSERT INTO survey_questions (question_text, type, is_active) VALUES (?, ?, 1)",
      [question_text, type]
    );
    const questionId = qResult.insertId;

    // 2. Assign to survey
    await conn.query(
      "INSERT INTO survey_question_assignments (survey_id, survey_question_id, `order`) VALUES (?, ?, ?)",
      [survey_id, questionId, order_number || 9999]
    );

    // 3. Insert options if applicable
    const insertedOptions = [];
    if ((type === "multiple_choice" || type === "single_choice" || type === "rating") && Array.isArray(options)) {
      for (const opt of options) {
        const text = opt.option_text?.trim();
        const score = parseFloat(opt.score) || 0;
        if (text) {
          const [oResult] = await conn.query(
            "INSERT INTO survey_question_options (survey_question_id, option_text, weight) VALUES (?, ?, ?)",
            [questionId, text, score]
          );
          insertedOptions.push({
            id: oResult.insertId,
            option_text: text,
            score
          });
        }
      }
    }

    // 4. Resequence questions
    await resequenceQuestions(survey_id, conn);

    // Get the assigned order number
    const [[{ order: finalOrder }]] = await conn.query(
      "SELECT `order` FROM survey_question_assignments WHERE survey_question_id = ?",
      [questionId]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Question created successfully.",
      data: {
        id: questionId,
        survey_id: parseInt(survey_id),
        question_text,
        type,
        order_number: finalOrder,
        options: insertedOptions
      }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Export Survey Questions List as PDF
 */
const exportQuestionsPDF = async (req, res, next) => {
  try {
    const selectedSurveyId = parseInt(req.query.survey_id);
    if (!selectedSurveyId) {
      return res.status(400).send("Survey ID is required.");
    }

    // 1. Fetch survey details
    const [[survey]] = await db.query("SELECT title, description FROM surveys WHERE id = ?", [selectedSurveyId]);
    if (!survey) {
      return res.status(404).send("Survey not found.");
    }

    // 2. Fetch questions
    const [questions] = await db.query(
      `SELECT sq.id, sq.question_text, sq.type, sqa.order AS order_number 
       FROM survey_questions sq 
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id 
       WHERE sqa.survey_id = ? 
       ORDER BY sqa.order ASC`,
      [selectedSurveyId]
    );

    // 3. Fetch options
    const [options] = await db.query(
      `SELECT sqo.id, sqo.survey_question_id, sqo.option_text, sqo.weight AS score 
       FROM survey_question_options sqo
       JOIN survey_question_assignments sqa ON sqo.survey_question_id = sqa.survey_question_id
       WHERE sqa.survey_id = ?
       ORDER BY sqo.id ASC`,
      [selectedSurveyId]
    );

    const questionsWithOptions = questions.map(q => {
      return {
        ...q,
        options: options.filter(opt => opt.survey_question_id === q.id)
      };
    });

    const data = {
      surveyTitle: survey.title,
      surveyDescription: survey.description || "",
      questions: questionsWithOptions,
      generatedAt: new Date()
    };

    // 4. Generate PDF stream
    const doc = pdfService.buildQuestionsReport(data);

    // 5. Set headers and stream response
    res.setHeader("Content-Disposition", `attachment; filename=Daftar_Pertanyaan_Survei_${selectedSurveyId}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  showQuestionsPage,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  apiGetQuestions,
  apiCreateQuestion,
  exportQuestionsPDF
};
