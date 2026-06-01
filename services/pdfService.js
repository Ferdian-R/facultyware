const PDFDocument = require("pdfkit");

/**
 * Service to generate PDF reports for SUKAFTI Admin
 */
const buildDashboardReport = (data) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  // Color Palette
  const colors = {
    primary: "#0f172a",    // Dark Slate
    secondary: "#475569",  // Mid Slate
    lightBg: "#f8fafc",    // Slate 50
    border: "#cbd5e1",     // Slate 300
    green: "#059669",      // Emerald
    darkGreen: "#15803d",
    red: "#dc2626",        // Red
    text: "#334155"        // Slate 700
  };

  // Header / Title Banner
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("LAPORAN DASHBOARD ANALYTICS SUKAFTI", { align: "center" })
    .moveDown(0.2);

  doc
    .fillColor(colors.secondary)
    .font("Helvetica")
    .fontSize(10)
    .text("Sistem Informasi Survey Kerja Sama FTI Universitas Andalas", { align: "center" })
    .moveDown(1.5);

  // Divider Line
  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1.5);

  // Section 1: Summary Statistics Cards
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Ringkasan Statistik Utama", { underline: true })
    .moveDown(0.8);

  const startY = doc.y;
  const cardWidth = 155;
  const cardHeight = 65;
  const gap = 15;

  // Card 1: Total Mitra
  drawCard(doc, 50, startY, cardWidth, cardHeight, "TOTAL MITRA", data.total_mitra.toString(), colors);

  // Card 2: PIN Aktif
  drawCard(
    doc,
    50 + cardWidth + gap,
    startY,
    cardWidth,
    cardHeight,
    "PIN AKTIF",
    data.total_pin_aktif.toString(),
    colors
  );

  // Card 3: Survey Selesai
  drawCard(
    doc,
    50 + (cardWidth + gap) * 2,
    startY,
    cardWidth,
    cardHeight,
    "SURVEY SELESAI",
    data.total_respons.toString(),
    colors
  );

  // Move cursor past the cards
  doc.y = startY + cardHeight + 30;

  // Section 2: Detailed Invitation List (Table)
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Daftar Token PIN & Aktivitas Mitra", { underline: true })
    .moveDown(0.8);

  // Draw Table Headers
  const tableTop = doc.y;
  const colWidths = {
    partner: 185,
    pin: 90,
    status: 90,
    usedAt: 130
  };

  doc
    .fillColor(colors.lightBg)
    .rect(50, tableTop, 495, 22)
    .fill()
    .strokeColor(colors.border)
    .rect(50, tableTop, 495, 22)
    .stroke();

  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(9);

  let currentX = 60;
  doc.text("PERUSAHAAN MITRA", currentX, tableTop + 6);
  currentX += colWidths.partner;
  doc.text("KODE PIN", currentX, tableTop + 6);
  currentX += colWidths.pin;
  doc.text("STATUS", currentX, tableTop + 6);
  currentX += colWidths.status;
  doc.text("DIGUNAKAN PADA", currentX, tableTop + 6);

  doc.y = tableTop + 22;

  // Draw Table Rows
  doc.font("Helvetica").fontSize(9).fillColor(colors.text);

  if (data.invitations && data.invitations.length > 0) {
    data.invitations.forEach((inv, index) => {
      // Prevent overflow to next page without headers
      if (doc.y > 700) {
        doc.addPage();
        // Redraw table headers on new page
        const newTableTop = doc.y;
        doc
          .fillColor(colors.lightBg)
          .rect(50, newTableTop, 495, 22)
          .fill()
          .strokeColor(colors.border)
          .rect(50, newTableTop, 495, 22)
          .stroke();

        doc
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .fontSize(9);

        let curX = 60;
        doc.text("PERUSAHAAN MITRA", curX, newTableTop + 6);
        curX += colWidths.partner;
        doc.text("KODE PIN", curX, newTableTop + 6);
        curX += colWidths.pin;
        doc.text("STATUS", curX, newTableTop + 6);
        curX += colWidths.status;
        doc.text("DIGUNAKAN PADA", curX, newTableTop + 6);

        doc.y = newTableTop + 22;
        doc.font("Helvetica").fontSize(9).fillColor(colors.text);
      }

      const rowTop = doc.y;
      const rowHeight = 22;

      // Alternating row background
      if (index % 2 === 1) {
        doc
          .fillColor("#f8fafc")
          .rect(50, rowTop, 495, rowHeight)
          .fill();
      }

      // Draw cell borders
      doc
        .strokeColor(colors.border)
        .rect(50, rowTop, 495, rowHeight)
        .stroke();

      doc.fillColor(colors.text);

      let x = 60;
      // Partner Name (Truncated if too long)
      const nameText = inv.nama_perusahaan.length > 32 
        ? inv.nama_perusahaan.substring(0, 30) + "..." 
        : inv.nama_perusahaan;
      doc.text(nameText, x, rowTop + 6);

      x += colWidths.partner;
      // PIN
      doc.font("Courier-Bold").text(inv.pin, x, rowTop + 6).font("Helvetica");

      x += colWidths.pin;
      // Status
      const isUsed = inv.is_used === 1;
      const statusText = isUsed ? "TERPAKAI" : "AKTIF";
      doc.fillColor(isUsed ? colors.red : colors.green);
      doc.text(statusText, x, rowTop + 6);
      doc.fillColor(colors.text);

      x += colWidths.status;
      // Used At Date
      let usedAtText = "—";
      if (inv.used_at) {
        const dateObj = new Date(inv.used_at);
        usedAtText = dateObj.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
      doc.text(usedAtText, x, rowTop + 6);

      doc.y = rowTop + rowHeight;
    });
  } else {
    doc
      .strokeColor(colors.border)
      .rect(50, doc.y, 495, 30)
      .stroke();
    doc.text("Tidak ada data token PIN survey.", 60, doc.y + 10, { align: "center", width: 475 });
    doc.y += 30;
  }

  // Footer metadata
  doc.y += 30;
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(`Dokumen ini di-generate secara otomatis oleh Sistem SUKAFTI pada: ${data.generatedAt.toLocaleString("id-ID")}`, {
      align: "left"
    });

  // Global Page Numbering
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(colors.secondary)
      .font("Helvetica")
      .fontSize(8)
      .text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: "right" });
  }

  // Finalize PDF
  doc.end();
  return doc;
};

// Helper function to draw card containers
function drawCard(doc, x, y, width, height, label, value, colors) {
  // Border & Background
  doc
    .fillColor(colors.lightBg)
    .rect(x, y, width, height)
    .fill()
    .strokeColor(colors.border)
    .lineWidth(1)
    .rect(x, y, width, height)
    .stroke();

  // Label text
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label, x + 15, y + 15);

  // Big Value text
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(value, x + 15, y + 30);
}

const buildQuestionsReport = (data) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  // Color Palette
  const colors = {
    primary: "#0f172a",    // Dark Slate
    secondary: "#475569",  // Mid Slate
    lightBg: "#f8fafc",    // Slate 50
    border: "#cbd5e1",     // Slate 300
    green: "#059669",      // Emerald
    text: "#334155"        // Slate 700
  };

  // Header / Title Banner
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("LAPORAN DAFTAR INSTRUMEN PERTANYAAN SURVEI", { align: "center" })
    .moveDown(0.2);

  doc
    .fillColor(colors.secondary)
    .font("Helvetica")
    .fontSize(10)
    .text("Sistem Informasi Survey Kerja Sama FTI Universitas Andalas (SUKAFTI)", { align: "center" })
    .moveDown(1.5);

  // Divider Line
  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1.5);

  const boxY = doc.y;
  const boxHeight = 45;

  // Metadata Block (Nama Survey, Pembuat, NIM)
  doc
    .fillColor(colors.lightBg)
    .rect(50, boxY, 495, boxHeight)
    .fill()
    .strokeColor(colors.border)
    .rect(50, boxY, 495, boxHeight)
    .stroke();

  const metaY = boxY + 10;
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(9);

  doc.text("JUDUL SURVEI:", 65, metaY);
  doc.text("TANGGAL CETAK:", 65, metaY + 16);

  doc.font("Helvetica").fillColor(colors.text);
  // Truncate survey title if it's too long, outputting with ellipsis formatting on a single line
  const truncatedTitle = data.surveyTitle.length > 60 ? data.surveyTitle.substring(0, 57) + "..." : data.surveyTitle;
  doc.text(truncatedTitle, 170, metaY, { width: 360, height: 12, ellipsis: true });
  doc.text(data.generatedAt.toLocaleString("id-ID"), 170, metaY + 16);

  // Move cursor strictly below the metadata box
  doc.y = boxY + boxHeight + 15;

  // List of Questions
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Butir Pertanyaan Kuesioner", { underline: true })
    .moveDown(1);

  if (data.questions && data.questions.length > 0) {
    data.questions.forEach((q) => {
      // Prevent overflow to next page
      if (doc.y > 650) {
        doc.addPage();
      }

      const qY = doc.y;
      const qText = q.question_text || "";
      const qHeight = doc.heightOfString(qText, { width: 465 });
      
      // Question block
      doc
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${q.order_number}. `, 50, qY, { width: 25, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(qText, 80, qY, { width: 465, align: "left" });

      // Move cursor below question text
      doc.y = qY + qHeight + 4;

      // Question Type Badge/Label
      let typeLabel = "";
      if (q.type === "essay") typeLabel = "Tipe: Essay (Jawaban Bebas)";
      else if (q.type === "multiple_choice") typeLabel = "Tipe: Pilihan Ganda";
      else if (q.type === "rating") typeLabel = "Tipe: Skala Rating (1-5)";

      const typeY = doc.y;
      doc
        .fillColor(colors.secondary)
        .font("Helvetica-Oblique")
        .fontSize(8.5)
        .text(typeLabel, 80, typeY);
      
      doc.y = typeY + doc.heightOfString(typeLabel, { width: 465 }) + 6;

      // Render Options if Mc or Rating
      if ((q.type === "multiple_choice" || q.type === "rating") && q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          // Prevent overflow
          if (doc.y > 720) {
            doc.addPage();
          }
          const optText = `[  ]  ${opt.option_text}  (Skor: ${opt.score})`;
          const optY = doc.y;
          doc
            .fillColor(colors.text)
            .font("Helvetica")
            .fontSize(9)
            .text(optText, 95, optY, { width: 450 });
          doc.y = optY + doc.heightOfString(optText, { width: 450 }) + 3;
        });
      } else {
        // Essay lines
        const lineText = "........................................................................................................................................................................";
        const lineY = doc.y;
        doc
          .fillColor(colors.text)
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text(lineText, 95, lineY, { width: 450 });
        doc.y = lineY + doc.heightOfString(lineText, { width: 450 }) + 3;
      }

      doc.y += 10; // Extra spacing between questions
    });
  } else {
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(colors.text).text("Belum ada data pertanyaan untuk survey ini.", { align: "center" });
  }

  // Footer metadata
  doc.y += 20;
  // Ensure we don't overflow the footer
  if (doc.y > 740) {
    doc.addPage();
  }
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(`Dokumen ini di-generate secara otomatis oleh Sistem SUKAFTI pada: ${data.generatedAt.toLocaleString("id-ID")}`, 50, doc.y);

  // Global Page Numbering
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(colors.secondary)
      .font("Helvetica")
      .fontSize(8)
      .text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: "right" });
  }

  // Finalize PDF
  doc.end();
  return doc;
};

module.exports = {
  buildDashboardReport,
  buildQuestionsReport
};
