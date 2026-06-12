const db = require("../config/db");

/**
 * Display the survey filling page
 * GET /survey-mitra
 */
const showSurveyPage = async (req, res, next) => {
  const partnerId = req.session.partnerId;
  const invitationId = req.session.invitationId;

  try {
    // 1. Fetch invitation details
    const [[invitation]] = await db.query(
      "SELECT survey_id, is_used FROM survey_invitations WHERE id = ?",
      [invitationId]
    );

    if (!invitation) {
      return res.render("login", {
        title: "Login Mitra | SUKAFTI",
        activeTab: "mitra",
        error: "Sesi kuesioner tidak valid. Silakan masuk kembali."
      });
    }

    // 2. Check if a completed response already exists for this invitation
    const [[existingResponse]] = await db.query(
      "SELECT id FROM survey_responses WHERE survey_invitation_id = ? AND status = 'completed'",
      [invitationId]
    );

    if (existingResponse) {
      req.session.lastResponseId = existingResponse.id;
      return res.redirect("/survey-mitra/success");
    }

    // 3. Fetch survey details
    const [[survey]] = await db.query(
      "SELECT title, description FROM surveys WHERE id = ?",
      [invitation.survey_id]
    );

    if (!survey) {
      return res.render("login", {
        title: "Login Mitra | SUKAFTI",
        activeTab: "mitra",
        error: "Survei tidak ditemukan atau telah dihapus."
      });
    }

    // 4. Fetch questions
    const [questions] = await db.query(
      "SELECT id, question_text, type, order_number FROM survey_questions WHERE survey_id = ? ORDER BY order_number ASC, id ASC",
      [invitation.survey_id]
    );

    // 5. Fetch options
    const [options] = await db.query(
      `SELECT sqo.id, sqo.survey_question_id, sqo.option_text, sqo.score 
       FROM survey_question_options sqo
       JOIN survey_questions sq ON sqo.survey_question_id = sq.id
       WHERE sq.survey_id = ?
       ORDER BY sqo.id ASC`,
      [invitation.survey_id]
    );

    // Map options to questions
    const questionsWithOptions = questions.map(q => {
      return {
        ...q,
        options: options.filter(opt => opt.survey_question_id === q.id)
      };
    });

    res.render("survey/fill", {
      title: `${survey.title} | SUKAFTI`,
      partnerName: req.session.partnerName,
      survey,
      questions: questionsWithOptions,
      error: req.query.error || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle survey submission
 * POST /survey-mitra/submit
 */
const submitSurvey = async (req, res, next) => {
  const partnerId = req.session.partnerId;
  const invitationId = req.session.invitationId;

  if (!partnerId || !invitationId) {
    return res.redirect("/login-mitra");
  }

  // 1. Fetch invitation details to get survey_id
  let invitation;
  try {
    const [[invRow]] = await db.query(
      "SELECT survey_id FROM survey_invitations WHERE id = ?",
      [invitationId]
    );
    invitation = invRow;
  } catch (err) {
    return next(err);
  }

  if (!invitation) {
    return res.redirect("/login-mitra?error=Sesi+tidak+valid.");
  }

  // Double submission check
  try {
    const [[existingResponse]] = await db.query(
      "SELECT id FROM survey_responses WHERE survey_invitation_id = ? AND status = 'completed'",
      [invitationId]
    );
    if (existingResponse) {
      req.session.lastResponseId = existingResponse.id;
      return res.redirect("/survey-mitra/success");
    }
  } catch (err) {
    return next(err);
  }

  // Fetch all questions for this survey to process input
  let questions;
  try {
    const [qRows] = await db.query(
      "SELECT id, type FROM survey_questions WHERE survey_id = ?",
      [invitation.survey_id]
    );
    questions = qRows;
  } catch (err) {
    return next(err);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let scoreTotal = 0;
    const answersToInsert = [];

    for (const q of questions) {
      const inputVal = req.body[`question_${q.id}`];
      
      // Validation: Check if answer is provided (except optional ones, but here all survey items are mandatory)
      if (inputVal === undefined || inputVal === null || inputVal === "") {
        throw new Error(`Jawaban untuk pertanyaan nomor ${q.id} belum diisi.`);
      }

      if (q.type === "essay") {
        answersToInsert.push({
          survey_question_id: q.id,
          survey_question_option_id: null,
          answer_text: inputVal,
          score: 0
        });
      } else {
        // multiple_choice or rating
        const optionId = parseInt(inputVal);
        const [[option]] = await conn.query(
          "SELECT score, option_text FROM survey_question_options WHERE id = ? AND survey_question_id = ?",
          [optionId, q.id]
        );

        if (!option) {
          throw new Error(`Opsi jawaban tidak valid untuk pertanyaan ID ${q.id}.`);
        }

        scoreTotal += option.score;
        answersToInsert.push({
          survey_question_id: q.id,
          survey_question_option_id: optionId,
          answer_text: null,
          score: option.score
        });
      }
    }

    // 2. Insert into survey_responses
    const [responseResult] = await conn.query(
      `INSERT INTO survey_responses (survey_id, partner_id, survey_invitation_id, status, score_total, submitted_at) 
       VALUES (?, ?, ?, 'completed', ?, NOW())`,
      [invitation.survey_id, partnerId, invitationId, scoreTotal]
    );
    const responseId = responseResult.insertId;

    // 3. Insert individual answers
    for (const ans of answersToInsert) {
      await conn.query(
        `INSERT INTO survey_answers (survey_response_id, survey_question_id, survey_question_option_id, answer_text, score) 
         VALUES (?, ?, ?, ?, ?)`,
        [responseId, ans.survey_question_id, ans.survey_question_option_id, ans.answer_text, ans.score]
      );
    }

    // 4. Audit Log
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"] || "";
    await conn.query(
      "INSERT INTO audit_logs (partner_id, activity, ip_address, user_agent) VALUES (?, 'SUBMIT_SURVEY', ?, ?)",
      [partnerId, ipAddress, userAgent]
    );

    await conn.commit();
    req.session.lastResponseId = responseId;
    res.redirect("/survey-mitra/success");
  } catch (err) {
    await conn.rollback();
    res.redirect(`/survey-mitra?error=${encodeURIComponent(err.message)}`);
  } finally {
    conn.release();
  }
};

/**
 * Display the success receipt page
 * GET /survey-mitra/success
 */
const showSuccessPage = async (req, res, next) => {
  const responseId = req.session.lastResponseId;
  const partnerId = req.session.partnerId;

  if (!responseId || !partnerId) {
    return res.redirect("/login-mitra");
  }

  try {
    const [[responseDetail]] = await db.query(
      `SELECT sr.id, sr.score_total, sr.submitted_at, s.title AS survey_title, p.name AS partner_name
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN partners p ON sr.partner_id = p.id
       WHERE sr.id = ? AND sr.partner_id = ?`,
      [responseId, partnerId]
    );

    if (!responseDetail) {
      return res.redirect("/login-mitra?error=Detail+respon+tidak+ditemukan.");
    }

    // Fetch questions and the partner's answers
    const [answers] = await db.query(
      `SELECT 
        sq.question_text, 
        sq.type AS question_type,
        sq.order_number,
        sa.answer_text, 
        sa.score AS answer_score,
        sqo.option_text AS selected_option
       FROM survey_answers sa
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       LEFT JOIN survey_question_options sqo ON sa.survey_question_option_id = sqo.id
       WHERE sa.survey_response_id = ?
       ORDER BY sq.order_number ASC, sq.id ASC`,
      [responseId]
    );

    res.render("survey/success", {
      title: "Survei Berhasil Dikirim | SUKAFTI",
      response: responseDetail,
      answers: answers
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  showSurveyPage,
  submitSurvey,
  showSuccessPage
};
