const db = require("../config/db");
const exceljs = require("exceljs");

/**
 * Renders the admin survey answers recap page
 * GET /admin/recap-answers
 */
const showRecapPage = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // 1. Fetch total count for pagination
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM survey_responses sr
       JOIN partners p ON sr.partner_id = p.id
       JOIN surveys s ON sr.survey_id = s.id
       WHERE sr.status = 'completed' AND (p.name LIKE ? OR s.title LIKE ?)`,
      [`%${search}%`, `%${search}%`]
    );
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // 2. Fetch responses list
    const [responses] = await db.query(
      `SELECT sr.id, sr.score_total, sr.submitted_at, s.title AS survey_title, p.name AS partner_name
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN partners p ON sr.partner_id = p.id
       WHERE sr.status = 'completed' AND (p.name LIKE ? OR s.title LIKE ?)
       ORDER BY sr.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, limit, offset]
    );

    res.render("dashboard/recap", {
      title: "Rekap Jawaban Mitra | SUKAFTI",
      user: req.session.username || "Admin FTI",
      responses,
      search,
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
 * Returns answers detail as JSON for modal popups
 * GET /admin/recap-answers/:id/json
 */
const getResponseDetailJSON = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify response exists
    const [[response]] = await db.query(
      `SELECT sr.id, sr.score_total, sr.submitted_at, s.title AS survey_title, p.name AS partner_name
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN partners p ON sr.partner_id = p.id
       WHERE sr.id = ?`,
      [id]
    );

    if (!response) {
      return res.status(404).json({ success: false, message: "Respon tidak ditemukan." });
    }

    // Fetch answers
    const [answers] = await db.query(
      `SELECT sa.id, sq.question_text, sq.type, sa.answer_text, sa.score, sqo.option_text
       FROM survey_answers sa
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       LEFT JOIN survey_question_options sqo ON sa.survey_question_option_id = sqo.id
       WHERE sa.survey_response_id = ?
       ORDER BY sq.order_number ASC, sq.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        response,
        answers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Exports all completed responses and answers to a formatted Excel file
 * GET /admin/recap-answers/export-excel
 */
const exportExcel = async (req, res, next) => {
  try {
    // 1. Fetch raw answers join query
    const [rows] = await db.query(
      `SELECT sr.id AS response_id, sr.score_total, sr.submitted_at, 
              s.title AS survey_title, p.name AS partner_name, p.email AS partner_email, p.phone AS partner_phone,
              sq.question_text, sq.type AS question_type, sa.answer_text, sa.score AS answer_score, sqo.option_text
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN partners p ON sr.partner_id = p.id
       JOIN survey_answers sa ON sa.survey_response_id = sr.id
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       LEFT JOIN survey_question_options sqo ON sa.survey_question_option_id = sqo.id
       WHERE sr.status = 'completed'
       ORDER BY sr.submitted_at DESC, sq.order_number ASC, sq.id ASC`
    );

    // 2. Initialize workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Jawaban Mitra");

    // Ensure grid lines are visible even with fill colors
    worksheet.views = [{ showGridLines: true }];

    // Set exact column widths to accommodate wrapped text
    const colWidths = [6, 22, 28, 45, 16, 20, 30, 8, 22];
    colWidths.forEach((w, colIdx) => {
      worksheet.getColumn(colIdx + 1).width = w;
    });

    // Title blocks
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "REKAPITULASI JAWABAN HASIL SURVEI MITRA";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells("A2:I2");
    const subtitleCell = worksheet.getCell("A2");
    subtitleCell.value = "SUKAFTI — Fakultas Teknologi Informasi Universitas Andalas";
    subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
    subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 20;

    worksheet.mergeCells("A3:I3");
    const dateCell = worksheet.getCell("A3");
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    dateCell.value = `Tanggal Ekspor: ${dateStr}`;
    dateCell.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    dateCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(3).height = 20;

    worksheet.addRow([]); // empty spacing row
    worksheet.getRow(4).height = 15;

    // Table Headers
    const headers = [
      "No",
      "Nama Mitra",
      "Judul Survei",
      "Teks Pertanyaan",
      "Tipe Pertanyaan",
      "Pilihan Jawaban",
      "Jawaban Essay",
      "Skor",
      "Tanggal Pengisian"
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;

    // Header styling
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" } // Deep Slate dark background
      };
      cell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFFFFFFF" } // white text
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF475569" } },
        left: { style: "thin", color: { argb: "FF475569" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        right: { style: "thin", color: { argb: "FF475569" } }
      };
    });

    // Write Data Rows
    let index = 1;
    rows.forEach((row) => {
      const typeMap = {
        essay: "Essay",
        multiple_choice: "Pilihan Ganda",
        rating: "Rating Skala"
      };

      const dateObj = new Date(row.submitted_at);
      const formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) + " " + dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      const dataRow = worksheet.addRow([
        index++,
        row.partner_name,
        row.survey_title,
        row.question_text,
        typeMap[row.question_type] || row.question_type,
        row.option_text || "—",
        row.answer_text || "—",
        row.question_type === "essay" ? "—" : row.answer_score,
        formattedDate
      ]);

      // Calculate dynamic row height based on content lengths
      const qLen = row.question_text ? row.question_text.length : 0;
      const essayLen = row.answer_text ? row.answer_text.length : 0;
      const maxTextLen = Math.max(qLen, essayLen);

      if (maxTextLen > 90) {
        dataRow.height = 56; // tall enough for 3+ lines
      } else if (maxTextLen > 45) {
        dataRow.height = 38; // tall enough for 2 lines
      } else {
        dataRow.height = 26; // clean single line height
      }

      // Styling normal data rows
      dataRow.eachCell((cell, colNum) => {
        cell.font = { name: "Arial", size: 9.5 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } }, // Slate-200 color
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        // Align columns appropriately
        if (colNum === 1 || colNum === 5 || colNum === 8 || colNum === 9) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        }
      });
    });

    // Write to response stream
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Rekap_Jawaban_Mitra.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  showRecapPage,
  getResponseDetailJSON,
  exportExcel
};
