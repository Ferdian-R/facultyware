const PDFDocument = require("pdfkit");


const buildDashboardReport = (data) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  
  const colors = {
    primary: "#0f172a",    
    secondary: "#475569",  
    lightBg: "#f8fafc",    
    border: "#cbd5e1",     
    green: "#059669",      
    darkGreen: "#15803d",
    red: "#dc2626",        
    text: "#334155"        
  };

  
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

  
  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1.5);

  
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

  
  drawCard(doc, 50, startY, cardWidth, cardHeight, "TOTAL MITRA", data.total_mitra.toString(), colors);

  
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

  
  doc.y = startY + cardHeight + 30;

  
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Daftar Token PIN & Aktivitas Mitra", { underline: true })
    .moveDown(0.8);

  
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

  
  doc.font("Helvetica").fontSize(9).fillColor(colors.text);

  if (data.invitations && data.invitations.length > 0) {
    data.invitations.forEach((inv, index) => {
      
      if (doc.y > 700) {
        doc.addPage();
        
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

      
      if (index % 2 === 1) {
        doc
          .fillColor("#f8fafc")
          .rect(50, rowTop, 495, rowHeight)
          .fill();
      }

      
      doc
        .strokeColor(colors.border)
        .rect(50, rowTop, 495, rowHeight)
        .stroke();

      doc.fillColor(colors.text);

      let x = 60;
      
      const nameText = inv.nama_perusahaan.length > 32 
        ? inv.nama_perusahaan.substring(0, 30) + "..." 
        : inv.nama_perusahaan;
      doc.text(nameText, x, rowTop + 6);

      x += colWidths.partner;
      
      doc.font("Courier-Bold").text(inv.pin, x, rowTop + 6).font("Helvetica");

      x += colWidths.pin;
      
      const isUsed = inv.is_used === 1;
      const statusText = isUsed ? "TERPAKAI" : "AKTIF";
      doc.fillColor(isUsed ? colors.red : colors.green);
      doc.text(statusText, x, rowTop + 6);
      doc.fillColor(colors.text);

      x += colWidths.status;
      
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

  
  doc.y += 30;
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(`Dokumen ini di-generate secara otomatis oleh Sistem SUKAFTI pada: ${data.generatedAt.toLocaleString("id-ID")}`, {
      align: "left"
    });

  
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(colors.secondary)
      .font("Helvetica")
      .fontSize(8)
      .text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: "right" });
  }

  
  doc.end();
  return doc;
};


function drawCard(doc, x, y, width, height, label, value, colors) {
  
  doc
    .fillColor(colors.lightBg)
    .rect(x, y, width, height)
    .fill()
    .strokeColor(colors.border)
    .lineWidth(1)
    .rect(x, y, width, height)
    .stroke();

  
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label, x + 15, y + 15);

  
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

  
  const colors = {
    primary: "#0f172a",    
    secondary: "#475569",  
    lightBg: "#f8fafc",    
    border: "#cbd5e1",     
    green: "#059669",      
    text: "#334155"        
  };

  
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

  
  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1.5);

  const boxY = doc.y;
  const boxHeight = 45;

  
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
  
  const truncatedTitle = data.surveyTitle.length > 60 ? data.surveyTitle.substring(0, 57) + "..." : data.surveyTitle;
  doc.text(truncatedTitle, 170, metaY, { width: 360, height: 12, ellipsis: true });
  doc.text(data.generatedAt.toLocaleString("id-ID"), 170, metaY + 16);

  
  doc.y = boxY + boxHeight + 15;

  
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Butir Pertanyaan Kuesioner", { underline: true })
    .moveDown(1);

  if (data.questions && data.questions.length > 0) {
    data.questions.forEach((q) => {
      
      if (doc.y > 650) {
        doc.addPage();
      }

      const qY = doc.y;
      const qText = q.question_text || "";
      doc.font("Helvetica-Bold").fontSize(10);
      const qHeight = doc.heightOfString(qText, { width: 465 });
      
      
      doc
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${q.order_number}. `, 50, qY, { width: 25, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(qText, 80, qY, { width: 465, align: "left" });

      
      doc.y = qY + qHeight + 4;

      
      let typeLabel = "";
      if (q.type === "essay" || q.type === "short_answer") typeLabel = "Tipe: Jawaban Singkat / Deskriptif";
      else if (q.type === "multiple_choice") typeLabel = "Tipe: Pilihan Ganda";
      else if (q.type === "single_choice") typeLabel = "Tipe: Pilihan Tunggal";
      else if (q.type === "rating") typeLabel = "Tipe: Skala Rating (1-5)";

      const typeY = doc.y;
      doc
        .fillColor(colors.secondary)
        .font("Helvetica-Oblique")
        .fontSize(8.5)
        .text(typeLabel, 80, typeY);
      
      doc.y = typeY + doc.heightOfString(typeLabel, { width: 465 }) + 6;

      
      if ((q.type === "multiple_choice" || q.type === "single_choice" || q.type === "rating") && q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          
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
        
        const lineText = "........................................................................................................................................................................";
        const lineY = doc.y;
        doc
          .fillColor(colors.text)
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text(lineText, 95, lineY, { width: 450 });
        doc.y = lineY + doc.heightOfString(lineText, { width: 450 }) + 3;
      }

      doc.y += 10; 
    });
  } else {
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(colors.text).text("Belum ada data pertanyaan untuk survey ini.", { align: "center" });
  }

  
  doc.y += 20;
  
  if (doc.y > 740) {
    doc.addPage();
  }
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(`Dokumen ini di-generate secara otomatis oleh Sistem SUKAFTI pada: ${data.generatedAt.toLocaleString("id-ID")}`, 50, doc.y);

  
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(colors.secondary)
      .font("Helvetica")
      .fontSize(8)
      .text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: "right" });
  }

  
  doc.end();
  return doc;
};

const buildPartnerDetailReport = (data) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  
  const colors = {
    primary: "#0f172a",    
    secondary: "#475569",  
    lightBg: "#f8fafc",    
    border: "#cbd5e1",     
    green: "#059669",      
    red: "#dc2626",        
    text: "#334155"        
  };

  const { partner, contacts, surveys, generatedAt } = data;

  
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("LAPORAN DETAIL PROFIL MITRA INDUSTRI", { align: "center" })
    .moveDown(0.2);

  doc
    .fillColor(colors.secondary)
    .font("Helvetica")
    .fontSize(10)
    .text("Sistem Informasi Survey Kerja Sama FTI Universitas Andalas (SUKAFTI)", { align: "center" })
    .moveDown(1.5);

  
  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1.5);

  
  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("A. Informasi Profil Perusahaan", { underline: true })
    .moveDown(0.8);

  const labelWidth = 120;
  const valueWidth = 375;

  const drawProfileRow = (label, value) => {
    const y = doc.y;
    doc
      .fillColor(colors.secondary)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text(label, 50, y, { width: labelWidth });

    doc
      .fillColor(colors.text)
      .font("Helvetica")
      .fontSize(9.5)
      .text(value || "—", 50 + labelWidth, y, { width: valueWidth });
    
    doc.y = Math.max(doc.y, y + doc.heightOfString(value || "—", { width: valueWidth })) + 6;
  };

  const formattedType = {
    university: "Perguruan Tinggi",
    company: "Perusahaan / Swasta",
    government: "Instansi Pemerintah",
    ngo: "Lembaga Swadaya Masyarakat (NGO)",
    other: "Lainnya"
  }[partner.type] || partner.type;

  drawProfileRow("Nama Perusahaan:", partner.name);
  drawProfileRow("Tipe Kemitraan:", formattedType);
  drawProfileRow("Status Akun:", partner.status === "active" ? "AKTIF / TERDAFTAR" : "NON-AKTIF / SUSPENDED");
  drawProfileRow("Email Resmi:", partner.email);
  drawProfileRow("Nomor Telepon:", partner.phone);
  drawProfileRow("Alamat Lengkap:", partner.address);
  drawProfileRow("Deskripsi Mitra:", partner.description);

  doc.y += 10;
  doc.x = 50; 

  
  if (doc.y > 650) {
    doc.addPage();
    doc.x = 50;
  }

  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("B. Daftar Kontak Hubung (Contact Persons)", { underline: true })
    .moveDown(0.8);

  
  const contactTop = doc.y;
  const contactColWidths = {
    name: 130,
    position: 100,
    email: 140,
    phone: 125
  };

  doc
    .fillColor(colors.lightBg)
    .rect(50, contactTop, 495, 20)
    .fill()
    .strokeColor(colors.border)
    .rect(50, contactTop, 495, 20)
    .stroke();

  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(8.5);

  let currentX = 60;
  doc.text("NAMA LENGKAP", currentX, contactTop + 5);
  currentX += contactColWidths.name;
  doc.text("JABATAN", currentX, contactTop + 5);
  currentX += contactColWidths.position;
  doc.text("EMAIL", currentX, contactTop + 5);
  currentX += contactColWidths.email;
  doc.text("TELEPON / HP", currentX, contactTop + 5);

  doc.y = contactTop + 20;
  doc.x = 50; 
  doc.font("Helvetica").fontSize(8.5).fillColor(colors.text);

  if (contacts && contacts.length > 0) {
    contacts.forEach((c, index) => {
      if (doc.y > 700) {
        doc.addPage();
        doc.x = 50;
      }

      const rowTop = doc.y;
      const rowHeight = 20;

      if (index % 2 === 1) {
        doc.fillColor("#f8fafc").rect(50, rowTop, 495, rowHeight).fill();
      }

      doc.strokeColor(colors.border).rect(50, rowTop, 495, rowHeight).stroke();
      doc.fillColor(colors.text);

      let x = 60;
      let contactNameText = c.name;
      if (c.is_primary === 1) {
        contactNameText += " (Utama)";
      }
      doc.text(contactNameText, x, rowTop + 5);

      x += contactColWidths.name;
      doc.text(c.position || "—", x, rowTop + 5);

      x += contactColWidths.position;
      doc.text(c.email || "—", x, rowTop + 5);

      x += contactColWidths.email;
      doc.text(c.phone || "—", x, rowTop + 5);

      doc.y = rowTop + rowHeight;
      doc.x = 50; 
    });
  } else {
    doc.strokeColor(colors.border).rect(50, doc.y, 495, 25).stroke();
    doc.text("Belum ada data kontak hubung.", 60, doc.y + 8, { align: "center", width: 475 });
    doc.y += 25;
    doc.x = 50;
  }

  doc.y += 20;
  doc.x = 50; 

  
  if (doc.y > 650) {
    doc.addPage();
    doc.x = 50;
  }

  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("C. Riwayat Pengisian Survei & Token PIN", { underline: true })
    .moveDown(0.8);

  const surveyTop = doc.y;
  const surveyColWidths = {
    title: 180,
    pin: 75,
    status: 90,
    usedAt: 90,
    score: 60
  };

  doc
    .fillColor(colors.lightBg)
    .rect(50, surveyTop, 495, 20)
    .fill()
    .strokeColor(colors.border)
    .rect(50, surveyTop, 495, 20)
    .stroke();

  doc
    .fillColor(colors.primary)
    .font("Helvetica-Bold")
    .fontSize(8.5);

  currentX = 60;
  doc.text("JUDUL SURVEI KUESIONER", currentX, surveyTop + 5);
  currentX += surveyColWidths.title;
  doc.text("KODE PIN", currentX, surveyTop + 5);
  currentX += surveyColWidths.pin;
  doc.text("STATUS", currentX, surveyTop + 5);
  currentX += surveyColWidths.status;
  doc.text("SELESAI PADA", currentX, surveyTop + 5);
  currentX += surveyColWidths.usedAt;
  doc.text("SKOR", currentX, surveyTop + 5);

  doc.y = surveyTop + 20;
  doc.x = 50; 
  doc.font("Helvetica").fontSize(8.5).fillColor(colors.text);

  if (surveys && surveys.length > 0) {
    surveys.forEach((s, index) => {
      if (doc.y > 700) {
        doc.addPage();
        doc.x = 50;
      }

      const rowTop = doc.y;
      const rowHeight = 20;

      if (index % 2 === 1) {
        doc.fillColor("#f8fafc").rect(50, rowTop, 495, rowHeight).fill();
      }

      doc.strokeColor(colors.border).rect(50, rowTop, 495, rowHeight).stroke();
      doc.fillColor(colors.text);

      let x = 60;
      doc.text(s.survey_title || "Survei SUKAFTI", x, rowTop + 5);

      x += surveyColWidths.title;
      doc.font("Courier-Bold").text(s.pin, x, rowTop + 5).font("Helvetica");

      x += surveyColWidths.pin;
      const isUsed = s.is_used === 1;
      doc.fillColor(isUsed ? colors.green : colors.red);
      doc.text(isUsed ? "TERSELESAIKAN" : "BELUM DIISI", x, rowTop + 5);
      doc.fillColor(colors.text);

      x += surveyColWidths.status;
      let usedAtText = "—";
      if (s.used_at) {
        const dateObj = new Date(s.used_at);
        usedAtText = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      }
      doc.text(usedAtText, x, rowTop + 5);

      x += surveyColWidths.usedAt;
      doc.text(isUsed ? `${s.score_total} Poin` : "—", x, rowTop + 5);

      doc.y = rowTop + rowHeight;
      doc.x = 50; 
    });
  } else {
    doc.strokeColor(colors.border).rect(50, doc.y, 495, 25).stroke();
    doc.text("Mitra belum terdaftar dalam aktivitas survei mana pun.", 60, doc.y + 8, { align: "center", width: 475 });
    doc.y += 25;
    doc.x = 50;
  }

  
  doc.y += 30;
  doc.x = 50; 
  if (doc.y > 740) {
    doc.addPage();
    doc.x = 50;
  }
  doc
    .fillColor(colors.secondary)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(`Dokumen Laporan Detail Kemitraan SUKAFTI | Di-generate secara otomatis pada: ${generatedAt.toLocaleString("id-ID")}`, 50, doc.y);

  
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(colors.secondary)
      .font("Helvetica")
      .fontSize(8)
      .text(`Halaman ${i + 1} dari ${range.count}`, 50, 800, { align: "right" });
  }

  doc.end();
  return doc;
};

module.exports = {
  buildDashboardReport,
  buildQuestionsReport,
  buildPartnerDetailReport
};
