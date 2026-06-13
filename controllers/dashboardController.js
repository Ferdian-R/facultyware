const db = require("../config/db");
const pdfService = require("../services/pdfService");

// Helper to generate a random 6-character alphanumeric PIN
const generateRandomPin = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit easily confused chars like 0, O, 1, I
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

/**
 * Controller to manage Dashboard Analytics and PIN Logic
 */
const showDashboard = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    // 1. Query general counts
    const [[{ total_mitra }]] = await db.query("SELECT COUNT(*) AS total_mitra FROM partners");
    const [[{ total_pin_aktif }]] = await db.query(
      "SELECT COUNT(*) AS total_pin_aktif FROM survey_invitations WHERE is_used = 0"
    );
    const [[{ total_respons }]] = await db.query(
      "SELECT COUNT(*) AS total_respons FROM survey_responses WHERE status = 'completed'"
    );
    const [[{ total_pin }]] = await db.query("SELECT COUNT(*) AS total_pin FROM survey_invitations");
    const [[{ average_skor }]] = await db.query(
      "SELECT AVG(score_total) AS average_skor FROM survey_responses WHERE status = 'completed'"
    );

    // 2. Query all partners for dropdown (exclude partners with active/unused PINs)
    const [allPartners] = await db.query(
      `SELECT id, name FROM partners 
       WHERE id NOT IN (
         SELECT partner_id FROM survey_invitations WHERE is_used = 0
       )
       ORDER BY name ASC`
    );

    // 3. Query PIN lists with search and pagination (joins partners and invitations)
    const [invitationsCountRows] = await db.query(
      `SELECT COUNT(*) AS total FROM survey_invitations si 
       JOIN partners p ON si.partner_id = p.id 
       WHERE p.name LIKE ?`,
      [`%${search}%`]
    );
    const totalItems = invitationsCountRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [perusahaan] = await db.query(
      `SELECT si.id, p.id AS partner_id, p.name AS nama_perusahaan, 
              si.pin AS pin_code, IF(si.is_used = 1, 'used', 'active') AS status_pin, 
              si.created_at, si.used_at
       FROM survey_invitations si
       JOIN partners p ON si.partner_id = p.id
       WHERE p.name LIKE ?
       ORDER BY si.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${search}%`, limit, offset]
    );

    // Render index template
    res.render("dashboard/index", {
      title: "Dashboard Admin | SUKAFTI",
      user: req.session.username || "Admin FTI",
      total_mitra,
      total_pin_aktif,
      total_respons,
      total_pin,
      average_skor,
      perusahaan,
      allPartners,
      search,
      page,
      totalPages,
      totalItems
    });
  } catch (err) {
    next(err);
  }
};

/**
 * RESTful API / Internal function to get dashboard stats & chart data in JSON
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // General counts
    const [[{ total_mitra }]] = await db.query("SELECT COUNT(*) AS total_mitra FROM partners");
    const [[{ total_pin_aktif }]] = await db.query(
      "SELECT COUNT(*) AS total_pin_aktif FROM survey_invitations WHERE is_used = 0"
    );
    const [[{ total_respons }]] = await db.query(
      "SELECT COUNT(*) AS total_respons FROM survey_responses WHERE status = 'completed'"
    );

    // PIN status breakdown
    const [[pinBreakdown]] = await db.query(
      `SELECT 
        SUM(CASE WHEN is_used = 0 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) AS used,
        0 AS expired
       FROM survey_invitations`
    );

    res.json({
      success: true,
      data: {
        total_mitra,
        total_pin_aktif,
        total_respons,
        pin_stats: {
          active: pinBreakdown.active || 0,
          used: pinBreakdown.used || 0,
          expired: pinBreakdown.expired || 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Generate a new invitation PIN for a partner
 */
const generatePIN = async (req, res, next) => {
  const { partner_id } = req.body;

  if (!partner_id) {
    return res.status(400).json({ success: false, message: "Partner ID is required." });
  }

  try {
    // Fetch the most recent published survey, or fallback to the latest survey
    const [surveys] = await db.query(
      "SELECT id FROM surveys WHERE status = 'published' ORDER BY id DESC LIMIT 1"
    );
    
    let surveyId = null;
    if (surveys.length > 0) {
      surveyId = surveys[0].id;
    } else {
      // Fallback: get any latest survey
      const [anySurveys] = await db.query("SELECT id FROM surveys ORDER BY id DESC LIMIT 1");
      if (anySurveys.length > 0) {
        surveyId = anySurveys[0].id;
      }
    }

    if (!surveyId) {
      return res.status(400).json({ 
        success: false, 
        message: "No surveys available in the database. Please create a survey first." 
      });
    }

    // Check if partner already has an active (unused) PIN for this survey
    const [existingPin] = await db.query(
      "SELECT id FROM survey_invitations WHERE partner_id = ? AND survey_id = ? AND is_used = 0",
      [partner_id, surveyId]
    );

    if (existingPin.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Mitra ini masih memiliki PIN aktif yang belum digunakan untuk survei ini."
      });
    }

    const pin = generateRandomPin();

    // Insert into database
    await db.query(
      "INSERT INTO survey_invitations (partner_id, survey_id, pin, is_used) VALUES (?, ?, ?, 0)",
      [partner_id, surveyId, pin]
    );

    res.json({
      success: true,
      pin_code: pin,
      message: "PIN generated successfully."
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Filter and fetch survey results with search, pagination, and filter parameters
 */
const filterSurveyResults = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let queryParams = [`%${search}%`];
    let whereClause = "p.name LIKE ?";

    if (status) {
      whereClause += " AND sr.status = ?";
      queryParams.push(status);
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM survey_responses sr
       JOIN partners p ON sr.partner_id = p.id
       WHERE ${whereClause}`,
      queryParams
    );

    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Append limit/offset parameters
    queryParams.push(limit, offset);

    const [rows] = await db.query(
      `SELECT sr.id, sr.status, sr.score_total, sr.submitted_at, 
              p.name AS partner_name, p.type AS partner_type
       FROM survey_responses sr
       JOIN partners p ON sr.partner_id = p.id
       WHERE ${whereClause}
       ORDER BY sr.submitted_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export Dashboard Report as PDF
 */
const exportDashboardPDF = async (req, res, next) => {
  try {
    // 1. Gather statistic metrics
    const [[{ total_mitra }]] = await db.query("SELECT COUNT(*) AS total_mitra FROM partners");
    const [[{ total_pin_aktif }]] = await db.query(
      "SELECT COUNT(*) AS total_pin_aktif FROM survey_invitations WHERE is_used = 0"
    );
    const [[{ total_respons }]] = await db.query(
      "SELECT COUNT(*) AS total_respons FROM survey_responses WHERE status = 'completed'"
    );

    // Fetch partners with invitation usage status
    const [invitations] = await db.query(
      `SELECT p.name AS nama_perusahaan, si.pin, si.is_used, si.used_at 
       FROM survey_invitations si
       JOIN partners p ON si.partner_id = p.id
       ORDER BY si.created_at DESC`
    );

    const data = {
      total_mitra,
      total_pin_aktif,
      total_respons,
      invitations,
      generatedAt: new Date()
    };

    // 2. Generate PDF stream
    const doc = pdfService.buildDashboardReport(data);

    // 3. Set headers and stream response
    res.setHeader("Content-Disposition", "attachment; filename=Laporan_Dashboard_SUKAFTI.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  showDashboard,
  getDashboardStats,
  generatePIN,
  filterSurveyResults,
  exportDashboardPDF
};
