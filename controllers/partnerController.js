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
 * Renders the partner management page
 * GET /admin/partners
 */
const showPartnersPage = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const type = req.query.type || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // 1. Gather stats metrics
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM partners");
    const active = total;
    const inactive = 0;

    // 2. Build filter queries
    let queryParams = [`%${search}%`, `%${search}%`];
    let whereClause = "(name LIKE ? OR email LIKE ?)";

    if (type) {
      whereClause += " AND type = ?";
      queryParams.push(type);
    }

    // Get filtered total items count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM partners WHERE ${whereClause}`,
      queryParams
    );
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated partners
    queryParams.push(limit, offset);
    const [partners] = await db.query(
      `SELECT id, name, type, email, phone, created_at 
       FROM partners 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      queryParams
    );

    res.render("dashboard/partners", {
      title: "Manajemen Mitra | SUKAFTI",
      user: req.session.username || "Admin FTI",
      partners,
      stats: { total, active, inactive },
      search,
      selectedType: type,
      selectedStatus: status,
      page,
      totalPages,
      totalItems,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Renders the detailed view of a partner
 * GET /admin/partners/:id
 */
const showPartnerDetailPage = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch partner profile
    const [[partner]] = await db.query("SELECT * FROM partners WHERE id = ?", [id]);
    if (!partner) {
      return res.redirect("/admin/partners?error=Mitra+tidak+ditemukan.");
    }

    // 2. Fetch contact persons
    const [contacts] = await db.query(
      "SELECT id, name, position, email, phone, is_primary FROM partner_contacts WHERE partner_id = ? ORDER BY is_primary DESC, id ASC",
      [id]
    );

    // 3. Fetch survey invitation and response history
    const [surveys] = await db.query(
      `SELECT si.pin, si.is_used, si.used_at, s.title AS survey_title, sr.id AS response_id 
       FROM survey_invitations si 
       JOIN surveys s ON si.survey_id = s.id 
       LEFT JOIN survey_responses sr ON si.id = sr.survey_invitation_id
       WHERE si.name = ?
       ORDER BY si.created_at DESC`,
      [partner.name]
    );

    res.render("dashboard/partner_detail", {
      title: `${partner.name} - Detail Kemitraan | SUKAFTI`,
      user: req.session.username || "Admin FTI",
      partner,
      contacts,
      surveys,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle form submission to create a new partner with primary contact in a single transaction
 * POST /admin/partners
 */
const createPartner = async (req, res, next) => {
  const { name, type, email, phone, address, description, contact_name, contact_position, contact_email, contact_phone } = req.body;

  if (!name || !type || !contact_name || !contact_position) {
    return res.redirect("/admin/partners?error=Data+input+tidak+lengkap.+Nama+mitra,+tipe,+dan+kontak+utama+wajib+diisi.");
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert partner profile
    const [partnerResult] = await conn.query(
      `INSERT INTO partners (name, type, email, phone, address, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, email || null, phone || null, address || null, description || null]
    );
    const partnerId = partnerResult.insertId;

    // 2. Insert primary contact person
    await conn.query(
      `INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [partnerId, contact_name, contact_position, contact_email || null, contact_phone || null]
    );

    await conn.commit();
    res.redirect(`/admin/partners?success=Mitra+${encodeURIComponent(name)}+berhasil+ditambahkan.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * Handle form submission to update partner profile details
 * POST /admin/partners/:id/update
 */
const updatePartner = async (req, res, next) => {
  const { id } = req.params;
  const { name, type, email, phone, address, description } = req.body;

  if (!name || !type) {
    return res.redirect(`/admin/partners/${id}?error=Nama+dan+Tipe+mitra+wajib+diisi.`);
  }

  try {
    await db.query(
      `UPDATE partners 
       SET name = ?, type = ?, email = ?, phone = ?, address = ?, description = ? 
       WHERE id = ?`,
      [name, type, email || null, phone || null, address || null, description || null, id]
    );

    res.redirect(`/admin/partners/${id}?success=Profil+mitra+berhasil+diperbarui.`);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle request to delete a partner (Web UI & HTMX)
 * DELETE /admin/partners/:id
 */
const deletePartner = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [[partner]] = await db.query("SELECT name FROM partners WHERE id = ?", [id]);
    if (!partner) {
      if (req.xhr || req.headers["hx-request"]) {
        return res.status(404).send("Mitra tidak ditemukan.");
      }
      return res.redirect("/admin/partners?error=Mitra+tidak+ditemukan.");
    }

    // Cascade delete partner (foreign keys configured as ON DELETE CASCADE in DB)
    await db.query("DELETE FROM partners WHERE id = ?", [id]);

    if (req.xhr || req.headers["hx-request"]) {
      // Return empty response for HTMX row removal
      return res.status(200).send("");
    }

    res.redirect(`/admin/partners?success=Mitra+${encodeURIComponent(partner.name)}+berhasil+dihapus.`);
  } catch (err) {
    next(err);
  }
};

/**
 * Add an additional contact person for a partner
 * POST /admin/partners/:id/contacts
 */
const addPartnerContact = async (req, res, next) => {
  const { id } = req.params;
  const { name, position, email, phone, is_primary } = req.body;
  const primaryVal = is_primary === "1" ? 1 : 0;

  if (!name || !position) {
    return res.redirect(`/admin/partners/${id}?error=Nama+dan+Jabatan+kontak+wajib+diisi.`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // If setting as primary contact, reset all other contacts for this partner first
    if (primaryVal === 1) {
      await conn.query("UPDATE partner_contacts SET is_primary = 0 WHERE partner_id = ?", [id]);
    }

    await conn.query(
      `INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, position, email || null, phone || null, primaryVal]
    );

    await conn.commit();
    res.redirect(`/admin/partners/${id}?success=Kontak+baru+berhasil+ditambahkan.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * Delete a specific contact person (HTMX / Web UI)
 * DELETE /admin/partners/contacts/:contactId
 */
const deletePartnerContact = async (req, res, next) => {
  const { contactId } = req.params;

  try {
    const [[contact]] = await db.query("SELECT partner_id, is_primary FROM partner_contacts WHERE id = ?", [contactId]);
    if (!contact) {
      if (req.xhr || req.headers["hx-request"]) {
        return res.status(404).send("Kontak tidak ditemukan.");
      }
      return res.redirect("/admin/partners?error=Kontak+tidak+ditemukan.");
    }

    if (contact.is_primary === 1) {
      if (req.xhr || req.headers["hx-request"]) {
        res.setHeader("HX-Trigger", JSON.stringify({ showAlert: "Kontak utama tidak dapat dihapus. Silakan tentukan kontak utama lain terlebih dahulu." }));
        return res.status(400).send("Kontak utama tidak dapat dihapus.");
      }
      return res.redirect(`/admin/partners/${contact.partner_id}?error=Kontak+utama+tidak+dapat+dihapus.+Sediakan+kontak+utama+lain+dulu.`);
    }

    await db.query("DELETE FROM partner_contacts WHERE id = ?", [contactId]);

    if (req.xhr || req.headers["hx-request"]) {
      return res.status(200).send("");
    }

    res.redirect(`/admin/partners/${contact.partner_id}?success=Kontak+berhasil+dihapus.`);
  } catch (err) {
    next(err);
  }
};

/**
 * Generates an A4 PDF Report of the Partner Profile & Contacts
 * GET /admin/partners/:id/export-pdf
 */
const exportPartnerPDF = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch details
    const [[partner]] = await db.query("SELECT * FROM partners WHERE id = ?", [id]);
    if (!partner) {
      return res.status(404).send("Partner not found.");
    }

    const [contacts] = await db.query(
      "SELECT id, name, position, email, phone, is_primary FROM partner_contacts WHERE partner_id = ? ORDER BY is_primary DESC, id ASC",
      [id]
    );

    const [surveys] = await db.query(
      `SELECT si.pin, si.is_used, si.used_at, s.title AS survey_title, sr.id AS response_id 
       FROM survey_invitations si 
       JOIN surveys s ON si.survey_id = s.id 
       LEFT JOIN survey_responses sr ON si.id = sr.survey_invitation_id
       WHERE si.name = ?
       ORDER BY si.created_at DESC`,
      [partner.name]
    );

    const data = {
      partner,
      contacts,
      surveys,
      generatedAt: new Date()
    };

    // 2. Generate PDF stream
    const doc = pdfService.buildPartnerDetailReport(data);

    // 3. Set download headers
    res.setHeader("Content-Disposition", `attachment; filename=Detail_Mitra_${id}_${partner.name.replace(/[name, type, email || null, phone || null, address || null, description || null]+/g, '_')}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * RESTful JSON API: Fetch all candidate partners
 * GET /api/partners
 */
const apiGetPartners = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    let query = "SELECT id, name, type, email, phone, created_at FROM partners";
    let params = [];

    if (search) {
      query += " WHERE name LIKE ? OR email LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY created_at DESC";

    const [partners] = await db.query(query, params);

    res.json({
      success: true,
      data: partners
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * RESTful JSON API: Create a new candidate partner programmatically
 * POST /api/partners
 */
const apiCreatePartner = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, type, email, phone, address, description, contact_name, contact_position, contact_email, contact_phone } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert partner profile
    const [partnerResult] = await conn.query(
      `INSERT INTO partners (name, type, email, phone, address, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, email || null, phone || null, address || null, description || null]
    );
    const partnerId = partnerResult.insertId;

    // 2. Insert primary contact person
    const [contactResult] = await conn.query(
      `INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [partnerId, contact_name, contact_position, contact_email || null, contact_phone || null]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Partner created successfully.",
      data: {
        id: partnerId,
        name,
        type,
        email,
        phone,
        address,
        description,
        primary_contact: {
          id: contactResult.insertId,
          name: contact_name,
          position: contact_position,
          email: contact_email || null,
          phone: contact_phone || null,
          is_primary: 1
        }
      }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

module.exports = {
  showPartnersPage,
  showPartnerDetailPage,
  createPartner,
  updatePartner,
  deletePartner,
  addPartnerContact,
  deletePartnerContact,
  exportPartnerPDF,
  apiGetPartners,
  apiCreatePartner
};
