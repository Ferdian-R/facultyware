const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const db = require("../config/db");
const dashboardController = require("../controllers/dashboardController");

// Validation helper middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * GET /api/dashboard-stats
 * Supplies total counts and donut chart data to the UI.
 */
router.get("/dashboard-stats", dashboardController.getDashboardStats);

/**
 * GET /api/pin-logs
 * Fetch all generated PIN codes and usage audit history.
 */
router.get("/pin-logs", async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM survey_invitations si
       JOIN partners p ON si.partner_id = p.id
       WHERE p.name LIKE ?`,
      [`%${search}%`]
    );

    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT si.id, p.id AS partner_id, p.name AS partner_name, 
              si.pin, si.is_used, si.used_at, si.created_at
       FROM survey_invitations si
       JOIN partners p ON si.partner_id = p.id
       WHERE p.name LIKE ?
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
      // 1. Verify partner exists
      const [[partner]] = await db.query("SELECT id FROM partners WHERE id = ?", [partner_id]);
      if (!partner) {
        return res.status(404).json({ success: false, message: "Partner not found." });
      }

      // 2. If survey_id not provided, find the latest survey
      if (!survey_id) {
        const [surveys] = await db.query("SELECT id FROM surveys ORDER BY id DESC LIMIT 1");
        if (surveys.length === 0) {
          return res.status(400).json({ success: false, message: "No surveys exist to link this PIN to." });
        }
        survey_id = surveys[0].id;
      }

      // 3. Generate PIN if not provided
      if (!pin) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        pin = "";
        for (let i = 0; i < 6; i++) {
          pin += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      // 4. Insert into database
      const [result] = await db.query(
        "INSERT INTO survey_invitations (partner_id, survey_id, pin, is_used) VALUES (?, ?, ?, 0)",
        [partner_id, survey_id, pin]
      );

      res.status(201).json({
        success: true,
        message: "PIN created successfully.",
        data: {
          id: result.insertId,
          partner_id,
          survey_id,
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

/**
 * PUT /api/pin-logs/:id
 * Update status of PIN or reset is_used status.
 */
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

/**
 * DELETE /api/pin-logs/:id
 * Delete a specific PIN code from database.
 */
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

// Import questionController & partnerController
const questionController = require("../controllers/questionController");
const partnerController = require("../controllers/partnerController");

/**
 * GET /api/questions
 * Fetch all survey questions.
 */
router.get("/questions", questionController.apiGetQuestions);

/**
 * POST /api/questions
 * Create a new survey question programmatically via JSON API.
 */
router.post(
  "/questions",
  [
    body("survey_id").isInt().withMessage("Survey ID must be an integer."),
    body("question_text").notEmpty().withMessage("Question text is required."),
    body("type")
      .isIn(["essay", "multiple_choice", "rating"])
      .withMessage("Type must be essay, multiple_choice, or rating."),
    body("order_number").optional().isInt().withMessage("Order number must be an integer."),
    body("options").optional().isArray().withMessage("Options must be an array of options with option_text and score.")
  ],
  validateRequest,
  questionController.apiCreateQuestion
);

/**
 * GET /api/partners
 * Fetch all candidate partners.
 */
router.get("/partners", partnerController.apiGetPartners);

/**
 * POST /api/partners
 * Create a new candidate partner programmatically via JSON API with primary contact.
 */
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

module.exports = router;
