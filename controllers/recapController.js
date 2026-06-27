const db = require("../config/db");
const exceljs = require("exceljs");

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
       JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       JOIN surveys s ON sr.survey_id = s.id
       WHERE (si.name LIKE ? OR s.title LIKE ?)`,
      [`%${search}%`, `%${search}%`]
    );
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // 2. Fetch responses list
    const [responses] = await db.query(
      `SELECT sr.id, sr.submitted_at, s.title AS survey_title, si.name AS partner_name,
              (
                 SELECT SUM(sqo.weight)
                 FROM survey_answers sa
                 JOIN survey_answer_options sao ON sa.id = sao.survey_answer_id
                 JOIN survey_question_options sqo ON sao.survey_question_option_id = sqo.id
                 WHERE sa.survey_response_id = sr.id
              ) AS score_total
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       WHERE (si.name LIKE ? OR s.title LIKE ?)
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

const getResponseDetailJSON = async (req, res, next) => {
  const { id } = req.params;

  try {
    
    const [[response]] = await db.query(
      `SELECT sr.id, sr.survey_id, sr.submitted_at, s.title AS survey_title, si.name AS partner_name,
              (
                 SELECT SUM(sqo.weight)
                 FROM survey_answers sa
                 JOIN survey_answer_options sao ON sa.id = sao.survey_answer_id
                 JOIN survey_question_options sqo ON sao.survey_question_option_id = sqo.id
                 WHERE sa.survey_response_id = sr.id
              ) AS score_total
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       WHERE sr.id = ?`,
      [id]
    );

    if (!response) {
      return res.status(404).json({ success: false, message: "Respon tidak ditemukan." });
    }

    
    const [answers] = await db.query(
      `SELECT sa.id, sq.question_text, sq.type, sa.answer_text, sqo.weight AS score, sqo.option_text
       FROM survey_answers sa
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       JOIN survey_question_assignments sqa ON sq.id = sqa.survey_question_id AND sqa.survey_id = ?
       LEFT JOIN survey_answer_options sao ON sa.id = sao.survey_answer_id
       LEFT JOIN survey_question_options sqo ON sao.survey_question_option_id = sqo.id
       WHERE sa.survey_response_id = ?
       ORDER BY sqa.order ASC, sq.id ASC`,
      [response.survey_id, id]
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

const exportExcel = async (req, res, next) => {
  try {
    
    const [rows] = await db.query(
      `SELECT sr.id AS response_id, sr.submitted_at, 
              s.title AS survey_title, si.name AS partner_name, si.email AS partner_email, si.phone AS partner_phone,
              sq.question_text, sq.type AS question_type, sa.answer_text, sqo.weight AS answer_score, sqo.option_text,
              (
                 SELECT SUM(sqo_inner.weight)
                 FROM survey_answers sa_inner
                 JOIN survey_answer_options sao_inner ON sa_inner.id = sao_inner.survey_answer_id
                 JOIN survey_question_options sqo_inner ON sao_inner.survey_question_option_id = sqo_inner.id
                 WHERE sa_inner.survey_response_id = sr.id
              ) AS score_total
       FROM survey_responses sr
       JOIN surveys s ON sr.survey_id = s.id
       JOIN survey_invitations si ON sr.survey_invitation_id = si.id
       JOIN survey_answers sa ON sa.survey_response_id = sr.id
       JOIN survey_questions sq ON sa.survey_question_id = sq.id
       LEFT JOIN survey_answer_options sao ON sa.id = sao.survey_answer_id
       LEFT JOIN survey_question_options sqo ON sao.survey_question_option_id = sqo.id
       ORDER BY sr.submitted_at DESC, sq.id ASC`
    );

    
    const responsesMap = {};
    const questionsSet = new Map();

    rows.forEach(r => {
      if (!responsesMap[r.response_id]) {
        const dateObj = new Date(r.submitted_at);
        const formattedDate = dateObj.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }) + " " + dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

        responsesMap[r.response_id] = {
          partner_name: r.partner_name,
          survey_title: r.survey_title,
          submitted_at: formattedDate,
          score_total: r.score_total || 0,
          answers: {}
        };
      }
      
      if (r.question_text) {
        if (!questionsSet.has(r.question_text)) {
          questionsSet.set(r.question_text, r.question_text);
        }

        let answerVal = "—";
        if (r.question_type === "essay" || r.question_type === "short_answer") {
          answerVal = r.answer_text || "—";
        } else {
          answerVal = r.option_text ? `${r.option_text} (Skor: ${r.answer_score})` : "—";
        }
        
        responsesMap[r.response_id].answers[r.question_text] = answerVal;
      }
    });

    const uniqueQuestions = Array.from(questionsSet.keys());

    
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Jawaban Mitra");

    worksheet.views = [{ showGridLines: true }];

    
    const colWidths = [6, 25, 30, 15, 20];
    uniqueQuestions.forEach(() => colWidths.push(40)); 
    colWidths.forEach((w, colIdx) => {
      worksheet.getColumn(colIdx + 1).width = w;
    });

    
    const lastColIndex = String.fromCharCode(65 + Math.min(colWidths.length - 1, 25)); 
    const mergeRange = `A1:${lastColIndex}1`;
    try { worksheet.mergeCells(`A1:${lastColIndex}1`); } catch(e){}
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "REKAPITULASI JAWABAN HASIL SURVEI MITRA";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 30;

    try { worksheet.mergeCells(`A2:${lastColIndex}2`); } catch(e){}
    const subtitleCell = worksheet.getCell("A2");
    subtitleCell.value = "SUKAFTI — Fakultas Teknologi Informasi Universitas Andalas";
    subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
    subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 20;

    try { worksheet.mergeCells(`A3:${lastColIndex}3`); } catch(e){}
    const dateCell = worksheet.getCell("A3");
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    dateCell.value = `Tanggal Ekspor: ${dateStr}`;
    dateCell.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    dateCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(3).height = 20;

    worksheet.addRow([]);
    worksheet.getRow(4).height = 15;

    
    const headers = [
      "No",
      "Nama Mitra",
      "Judul Survei",
      "Total Skor",
      "Tanggal Pengisian",
      ...uniqueQuestions
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 35; 

    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF475569" } },
        left: { style: "thin", color: { argb: "FF475569" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        right: { style: "thin", color: { argb: "FF475569" } }
      };
    });

    
    let index = 1;
    const responseArr = Object.values(responsesMap);
    
    responseArr.forEach((resp) => {
      const rowData = [
        index++,
        resp.partner_name,
        resp.survey_title,
        resp.score_total,
        resp.submitted_at
      ];

      
      uniqueQuestions.forEach(qText => {
        rowData.push(resp.answers[qText] || "—");
      });

      const dataRow = worksheet.addRow(rowData);
      dataRow.height = 40; 

      dataRow.eachCell((cell, colNum) => {
        cell.font = { name: "Arial", size: 9.5 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };

        if (colNum === 1 || colNum === 4 || colNum === 5) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        }
      });
    });

    
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
