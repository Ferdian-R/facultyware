const db = require("../config/db");
const { validationResult } = require("express-validator");
const pdfService = require("../services/pdfService");


const toArray = (val) => {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
};


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
    const [[{ active }]] = await db.query("SELECT COUNT(*) AS active FROM partners WHERE is_active = 1");
    const inactive = total - active;

    
    let queryParams = [`%${search}%`, `%${search}%`];
    let whereClause = "(name LIKE ? OR email LIKE ?)";

    if (type) {
      whereClause += " AND type = ?";
      queryParams.push(type);
    }
    
    if (status) {
      whereClause += " AND is_active = ?";
      queryParams.push(status === "active" ? 1 : 0);
    }

    
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM partners WHERE ${whereClause}`,
      queryParams
    );
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    
    queryParams.push(limit, offset);
    const [partners] = await db.query(
      `SELECT id, name, type, email, phone, created_at, IF(is_active = 1, 'active', 'inactive') AS status 
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


const showPartnerDetailPage = async (req, res, next) => {
  const { id } = req.params;

  try {
    
    const [[partner]] = await db.query("SELECT *, IF(is_active = 1, 'active', 'inactive') AS status FROM partners WHERE id = ?", [id]);
    if (!partner) {
      return res.redirect("/admin/partners?error=Mitra+tidak+ditemukan.");
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


const createPartner = async (req, res, next) => {
  const { name, type, status, email, phone, address, description, contact_name, contact_position, contact_email, contact_phone } = req.body;

  if (!name || !type || !contact_name || !contact_position) {
    return res.redirect("/admin/partners?error=Data+input+tidak+lengkap.+Nama+mitra,+tipe,+dan+kontak+utama+wajib+diisi.");
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    
    const [partnerResult] = await conn.query(
      `INSERT INTO partners (name, type, email, phone, address, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, email || null, phone || null, address || null, description || null]
    );
    const partnerId = partnerResult.insertId;

    
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


const updatePartner = async (req, res, next) => {
  const { id } = req.params;
  const { name, type, status, email, phone, address, description } = req.body;

  if (!name || !type) {
    return res.redirect(`/admin/partners/${id}?error=Nama+dan+Tipe+mitra+wajib+diisi.`);
  }

  try {
    await db.query(
      `UPDATE partners 
       SET name = ?, type = ?, is_active = ?, email = ?, phone = ?, address = ?, description = ? 
       WHERE id = ?`,
      [name, type, status === 'active' ? 1 : 0, email || null, phone || null, address || null, description || null, id]
    );

    res.redirect(`/admin/partners/${id}?success=Profil+mitra+berhasil+diperbarui.`);
  } catch (err) {
    next(err);
  }
};


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

    
    await db.query("DELETE FROM partners WHERE id = ?", [id]);

    if (req.xhr || req.headers["hx-request"]) {
      
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
    const [[partner]] = await db.query("SELECT *, IF(is_active = 1, 'active', 'inactive') AS status FROM partners WHERE id = ?", [id]);
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

    
    const doc = pdfService.buildPartnerDetailReport(data);

    
    res.setHeader("Content-Disposition", `attachment; filename=Detail_Mitra_${id}_${partner.name.replace(/[name, type, email || null, phone || null, address || null, description || null]+/g, '_')}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
  } catch (err) {
    next(err);
  }
};


const apiGetPartners = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    let query = "SELECT id, name, type, email, phone, created_at, IF(is_active = 1, 'active', 'inactive') AS status FROM partners";
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


const apiCreatePartner = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, type, status, email, phone, address, description, contact_name, contact_position, contact_email, contact_phone } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    
    const [partnerResult] = await conn.query(
      `INSERT INTO partners (name, type, email, phone, address, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, email || null, phone || null, address || null, description || null]
    );
    const partnerId = partnerResult.insertId;

    
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
