const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const db = require("../config/db");
const dashboardController = require("../controllers/dashboardController");


const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};


router.get("/dashboard-stats", dashboardController.getDashboardStats);


router.get("/pin-logs", async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM survey_invitations si
       WHERE si.name LIKE ?`,
      [`%${search}%`]
    );

    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT si.id, NULL AS partner_id, si.name AS partner_name, 
              si.pin, si.is_used, si.used_at, si.created_at
       FROM survey_invitations si
       WHERE si.name LIKE ?
       ORDER BY si.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${search}%`, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/pin-logs
 * Create a new PIN token programmatically via API.
 */
router.post(
  "/pin-logs",
  [
    body("partner_id").isInt().withMessage("Partner ID must be an integer."),
    body("survey_id").optional().isInt().withMessage("Survey ID must be an integer."),
    body("pin")
      .optional()
      .isAlphanumeric()
      .isLength({ min: 4, max: 10 })
      .withMessage("PIN must be alphanumeric and between 4 to 10 characters.")
  ],
  validateRequest,
  async (req, res, next) => {
    let { partner_id, survey_id, pin } = req.body;

    try {
      
      const [[partner]] = await db.query("SELECT id, name, email, phone FROM partners WHERE id = ?", [partner_id]);
      if (!partner) {
        return res.status(404).json({ success: false, message: "Partner not found." });
      }

      
      if (!survey_id) {
        const [surveys] = await db.query("SELECT id FROM surveys ORDER BY id DESC LIMIT 1");
        if (surveys.length === 0) {
          return res.status(400).json({ success: false, message: "No surveys exist to link this PIN to." });
        }
        survey_id = surveys[0].id;
      }

      
      if (!pin) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        pin = "";
        for (let i = 0; i < 6; i++) {
          pin += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      // 4. Insert into database
      const [result] = await db.query(
        "INSERT INTO survey_invitations (survey_id, name, email, phone, pin, is_used) VALUES (?, ?, ?, ?, ?, 0)",
        [survey_id, partner.name, partner.email, partner.phone, pin]
      );

      res.status(201).json({
        success: true,
        message: "PIN created successfully.",
        data: {
          id: result.insertId,
          survey_id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          pin,
          is_used: 0
        }
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "This PIN token is already in use." });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


router.put(
  "/pin-logs/:id",
  [
    param("id").isInt().withMessage("PIN ID must be an integer."),
    body("is_used").isInt({ min: 0, max: 1 }).withMessage("is_used status must be 0 or 1."),
    body("pin")
      .optional()
      .isAlphanumeric()
      .isLength({ min: 4, max: 10 })
      .withMessage("PIN must be alphanumeric and between 4 to 10 characters.")
  ],
  validateRequest,
  async (req, res, next) => {
    const { id } = req.params;
    const { is_used, pin } = req.body;

    try {
      const [[existingPin]] = await db.query("SELECT id FROM survey_invitations WHERE id = ?", [id]);
      if (!existingPin) {
        return res.status(404).json({ success: false, message: "PIN not found." });
      }

      const usedAt = is_used === 1 ? new Date() : null;

      let updateQuery = "UPDATE survey_invitations SET is_used = ?, used_at = ?";
      let queryParams = [is_used, usedAt];

      if (pin) {
        updateQuery += ", pin = ?";
        queryParams.push(pin);
      }

      updateQuery += " WHERE id = ?";
      queryParams.push(id);

      await db.query(updateQuery, queryParams);

      res.json({
        success: true,
        message: "PIN updated successfully.",
        data: {
          id: parseInt(id),
          is_used,
          used_at: usedAt,
          pin: pin || null
        }
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "This PIN token is already in use." });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


router.delete(
  "/pin-logs/:id",
  [param("id").isInt().withMessage("PIN ID must be an integer.")],
  validateRequest,
  async (req, res, next) => {
    const { id } = req.params;

    try {
      const [[existingPin]] = await db.query("SELECT id FROM survey_invitations WHERE id = ?", [id]);
      if (!existingPin) {
        return res.status(404).json({ success: false, message: "PIN not found." });
      }

      await db.query("DELETE FROM survey_invitations WHERE id = ?", [id]);

      res.json({
        success: true,
        message: "PIN deleted successfully."
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


const questionController = require("../controllers/questionController");
const partnerController = require("../controllers/partnerController");


router.get("/questions", questionController.apiGetQuestions);


router.post(
  "/questions",
  [
    body("survey_id").isInt().withMessage("Survey ID must be an integer."),
    body("question_text").notEmpty().withMessage("Question text is required."),
    body("type")
      .isIn(["short_answer", "single_choice", "multiple_choice"])
      .withMessage("Type must be short_answer, single_choice, or multiple_choice."),
    body("order_number").optional().isInt().withMessage("Order number must be an integer."),
    body("options").optional().isArray().withMessage("Options must be an array of options with option_text and score.")
  ],
  validateRequest,
  questionController.apiCreateQuestion
);


router.get("/partners", partnerController.apiGetPartners);


router.post(
  "/partners",
  [
    body("name").notEmpty().withMessage("Nama mitra wajib diisi."),
    body("type")
      .isIn(["university", "company", "government", "ngo", "other"])
      .withMessage("Tipe mitra tidak valid. Harus university, company, government, ngo, atau other."),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Format email mitra tidak valid."),
    body("phone").optional({ checkFalsy: true }).isString(),
    body("contact_name").notEmpty().withMessage("Nama kontak utama wajib diisi."),
    body("contact_position").notEmpty().withMessage("Jabatan kontak utama wajib diisi."),
    body("contact_email").optional({ checkFalsy: true }).isEmail().withMessage("Format email kontak tidak valid."),
    body("contact_phone").optional({ checkFalsy: true }).isString()
  ],
  validateRequest,
  partnerController.apiCreatePartner
);


router.get("/survey-responses", async (req, res, next) => {
  try {
    const surveyId = parseInt(req.query.survey_id);
    const partnerId = parseInt(req.query.partner_id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = "1=1";
    let params = [];

    if (surveyId) {
      whereClause += " AND sr.survey_id = ?";
      params.push(surveyId);
    }
    
    

    
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM survey_responses sr WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    
    const selectParams = [...params, limit, offset];
    const [responses] = await db.query(
      `SELECT sr.id, sr.survey_id, sr.survey_invitation_id, sr.submitted_at, sr.created_at,
              s.title AS survey_title, si.name AS partner_name
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       LEFT JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       WHERE ${whereClause}
       ORDER BY sr.submitted_at DESC
       LIMIT ? OFFSET ?`,
      selectParams
    );

    if (responses.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
      });
    }

    
    const responseIds = responses.map(r => r.id);
    const [answers] = await db.query(
      `SELECT sa.id, sa.survey_response_id, sa.survey_question_id, sa.survey_question_option_id, sa.answer_text, sa.score,
              sq.question_text, sq.type AS question_type, sqo.option_text
       FROM survey_answers sa
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       LEFT JOIN survey_question_options sqo ON sa.survey_question_option_id = sqo.id
       WHERE sa.survey_response_id IN (?)
       ORDER BY sa.survey_response_id DESC, sq.order_number ASC, sq.id ASC`,
      [responseIds]
    );

    
    const data = responses.map(r => {
      return {
        ...r,
        answers: answers.filter(a => a.survey_response_id === r.id).map(a => ({
          id: a.id,
          survey_question_id: a.survey_question_id,
          question_text: a.question_text,
          question_type: a.question_type,
          survey_question_option_id: a.survey_question_option_id,
          option_text: a.option_text,
          answer_text: a.answer_text,
          score: a.score
        }))
      };
    });

    res.json({
      success: true,
      data,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.post(
  "/survey-responses",
  [
    body("survey_id").isInt().withMessage("Survey ID must be an integer."),
    body("survey_invitation_id").optional().isInt().withMessage("Survey Invitation ID must be an integer."),
    body("answers").isArray({ min: 1 }).withMessage("Answers must be a non-empty array."),
    body("answers.*.survey_question_id").isInt().withMessage("Each answer must have a valid survey_question_id."),
    body("answers.*.survey_question_option_id").optional({ checkFalsy: true }).isInt().withMessage("Option ID must be an integer."),
    body("answers.*.answer_text").optional({ checkFalsy: true }).isString()
  ],
  validateRequest,
  async (req, res, next) => {
    const { survey_id, survey_invitation_id, answers } = req.body;

    
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

      const answersToInsert = [];

      for (const ans of answers) {
        const qId = ans.survey_question_id;

        
        const [qResult] = await conn.query(`
          SELECT sq.type 
          FROM survey_questions sq
          JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id
          WHERE sq.id = ? AND sqa.survey_id = ?
        `, [qId, survey_id]);
        
        if (qResult.length === 0) {
          throw new Error(`Question ID ${qId} does not belong to survey ID ${survey_id}.`);
        }
        const q = qResult[0];

        if (q.type === "short_answer") {
          answersToInsert.push({
            survey_question_id: qId,
            survey_question_option_id: null,
            answer_text: ans.answer_text || ""
          });
        } else {
          // single_choice or multiple_choice
          const optionId = ans.survey_question_option_id;
          if (!optionId) {
            throw new Error(`survey_question_option_id is required for choice question ID ${qId}.`);
          }

          const [[option]] = await conn.query(
            "SELECT id FROM survey_question_options WHERE id = ? AND survey_question_id = ?",
            [optionId, qId]
          );

          if (!option) {
            throw new Error(`Option ID ${optionId} does not belong to question ID ${qId}.`);
          }

          answersToInsert.push({
            survey_question_id: qId,
            survey_question_option_id: optionId,
            answer_text: null
          });
        }
      }

      // 2. Insert response
      const [responseResult] = await conn.query(
        `INSERT INTO survey_responses (survey_id, survey_invitation_id, submitted_at) 
         VALUES (?, ?, NOW())`,
        [survey_id, survey_invitation_id || null]
      );
      const responseId = responseResult.insertId;

      // 3. Insert individual answers
      for (const ans of answersToInsert) {
        const [saResult] = await conn.query(
          `INSERT INTO survey_answers (survey_response_id, survey_question_id, answer_text) 
           VALUES (?, ?, ?)`,
          [responseId, ans.survey_question_id, ans.answer_text]
        );
        if (ans.survey_question_option_id) {
          await conn.query(
            `INSERT INTO survey_answer_options (survey_answer_id, survey_question_option_id) VALUES (?, ?)`,
            [saResult.insertId, ans.survey_question_option_id]
          );
        }
      }

      // 5. If survey_invitation_id was provided, mark it as used
      if (survey_invitation_id) {
        await conn.query(
          "UPDATE survey_invitations SET is_used = 1, used_at = NOW() WHERE id = ?",
          [survey_invitation_id]
        );
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: "Survey response submitted successfully.",
        data: {
          response_id: responseId,
          survey_id,
          survey_invitation_id: survey_invitation_id || null
        }
      });
    } catch (err) {
      await conn.rollback();
      res.status(400).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
