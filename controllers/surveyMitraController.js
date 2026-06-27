const db = require("../config/db");

const showSurveyPage = async (req, res, next) => {
  const partnerId = req.session.partnerId; 
  const invitationId = req.session.invitationId;

  try {
    
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

    
    const [[existingResponse]] = await db.query(
      "SELECT id FROM survey_responses WHERE survey_invitation_id = ?",
      [invitationId]
    );

    if (existingResponse) {
      req.session.lastResponseId = existingResponse.id;
      return res.redirect("/survey-mitra/success");
    }

    
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

    
    const [questions] = await db.query(
      `SELECT sq.id, sq.question_text, sq.type, sqa.order AS order_number 
       FROM survey_questions sq 
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id 
       WHERE sqa.survey_id = ? 
       ORDER BY sqa.order ASC`,
      [invitation.survey_id]
    );

    
    const [options] = await db.query(
      `SELECT sqo.id, sqo.survey_question_id, sqo.option_text, sqo.weight AS score 
       FROM survey_question_options sqo
       JOIN survey_question_assignments sqa ON sqo.survey_question_id = sqa.survey_question_id
       WHERE sqa.survey_id = ?
       ORDER BY sqo.id ASC`,
      [invitation.survey_id]
    );

    
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

const submitSurvey = async (req, res, next) => {
  const partnerId = req.session.partnerId;
  const invitationId = req.session.invitationId;

  if (!invitationId) {
    return res.redirect("/login-mitra");
  }

  
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

  
  try {
    const [[existingResponse]] = await db.query(
      "SELECT id FROM survey_responses WHERE survey_invitation_id = ?",
      [invitationId]
    );
    if (existingResponse) {
      req.session.lastResponseId = existingResponse.id;
      return res.redirect("/survey-mitra/success");
    }
  } catch (err) {
    return next(err);
  }

  
  let questions;
  try {
    const [qRows] = await db.query(
      `SELECT sq.id, sq.type 
       FROM survey_questions sq
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id
       WHERE sqa.survey_id = ?`,
      [invitation.survey_id]
    );
    questions = qRows;
  } catch (err) {
    return next(err);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const answersToProcess = [];

    for (const q of questions) {
      const inputVal = req.body[`question_${q.id}`];
      
      
      if (inputVal === undefined || inputVal === null || inputVal === "") {
        throw new Error(`Jawaban untuk pertanyaan belum diisi.`);
      }

      if (q.type === "short_answer" || q.type === "essay") {
        answersToProcess.push({
          survey_question_id: q.id,
          answer_text: inputVal,
          option_id: null
        });
      } else {
        
        const optionId = parseInt(inputVal);
        const [[option]] = await conn.query(
          "SELECT id FROM survey_question_options WHERE id = ? AND survey_question_id = ?",
          [optionId, q.id]
        );

        if (!option) {
          throw new Error(`Opsi jawaban tidak valid.`);
        }

        answersToProcess.push({
          survey_question_id: q.id,
          answer_text: null,
          option_id: optionId
        });
      }
    }

    
    const [responseResult] = await conn.query(
      `INSERT INTO survey_responses (survey_id, survey_invitation_id, submitted_at) 
       VALUES (?, ?, NOW())`,
      [invitation.survey_id, invitationId]
    );
    const responseId = responseResult.insertId;

    
    for (const ans of answersToProcess) {
      const [saResult] = await conn.query(
        `INSERT INTO survey_answers (survey_response_id, survey_question_id, answer_text) 
         VALUES (?, ?, ?)`,
        [responseId, ans.survey_question_id, ans.answer_text]
      );
      
      if (ans.option_id) {
        const saId = saResult.insertId;
        await conn.query(
          `INSERT INTO survey_answer_options (survey_answer_id, survey_question_option_id) 
           VALUES (?, ?)`,
          [saId, ans.option_id]
        );
      }
    }

    
    
    
    await conn.query(
      "UPDATE survey_invitations SET is_used = 1, used_at = NOW() WHERE id = ?",
      [invitationId]
    );

    await conn.commit();
    req.session.lastResponseId = responseId;
    
    
    
    req.session.save((err) => {
      if (err) return next(err);
      res.redirect("/survey-mitra/success");
    });
  } catch (err) {
    await conn.rollback();
    res.redirect(`/survey-mitra?error=${encodeURIComponent(err.message)}`);
  } finally {
    if (conn) conn.release();
  }
};

const showSuccessPage = async (req, res, next) => {
  const responseId = req.session.lastResponseId;

  if (!responseId) {
    return res.redirect("/login-mitra");
  }

  try {
    const [[responseDetail]] = await db.query(
      `SELECT sr.id, sr.survey_id, sr.submitted_at, s.title AS survey_title, si.name AS partner_name
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       WHERE sr.id = ?`,
      [responseId]
    );

    if (!responseDetail) {
      return res.redirect("/login-mitra?error=Detail+respon+tidak+ditemukan.");
    }

    
    const [answers] = await db.query(
      `SELECT 
        sq.question_text, 
        sq.type AS question_type,
        sqa.order AS order_number,
        sa.answer_text, 
        sqo.weight AS answer_score,
        sqo.option_text AS selected_option
       FROM survey_answers sa
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id AND sqa.survey_id = ?
       LEFT JOIN survey_answer_options sao ON sa.id = sao.survey_answer_id
       LEFT JOIN survey_question_options sqo ON sao.survey_question_option_id = sqo.id
       WHERE sa.survey_response_id = ?
       ORDER BY sqa.order ASC, sq.id ASC`,
      [responseDetail.survey_id, responseId]
    );
    
    
    let scoreTotal = 0;
    answers.forEach(a => {
      if (a.answer_score) scoreTotal += parseFloat(a.answer_score);
    });
    responseDetail.score_total = scoreTotal;

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
