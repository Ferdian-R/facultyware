const db = require("../config/db");

async function seed() {
  try {
    console.log("Starting partner database seeding...");

    // 1. Check if partners already exist
    const [partners] = await db.query("SELECT * FROM partners LIMIT 1");
    if (partners.length > 0) {
      console.log("Partners already exist in database. Skipping seeding.");
      process.exit(0);
    }

    // 2. Define sample partners
    const samplePartners = [
      {
        name: "PT Semen Padang",
        type: "company",
        address: "Indarung, Padang, Sumatera Barat",
        email: "info@semenpadang.co.id",
        phone: "0751-815111",
        description: "BUMN produsen semen tertua di Indonesia, aktif menerima mahasiswa magang FTI.",
        status: "active",
        contact: {
          name: "Budi Santoso, M.T.",
          position: "Kepala Departemen SDM & Diklat",
          email: "budi.santoso@semenpadang.co.id",
          phone: "0812-3456-7890"
        }
      },
      {
        name: "Dinas Kominfo Provinsi Sumatera Barat",
        type: "government",
        address: "Jl. Pramuka Raya No.11, Padang",
        email: "diskominfotik@sumbarprov.go.id",
        phone: "0751-890222",
        description: "Lembaga pemerintahan yang mengelola teknologi informasi dan komunikasi daerah.",
        status: "active",
        contact: {
          name: "Sri Wahyuni, S.Kom.",
          position: "Kepala Bidang Aplikasi Informatika",
          email: "sri.wahyuni@sumbarprov.go.id",
          phone: "0811-9876-5432"
        }
      },
      {
        name: "PT Telkom Indonesia Witel Sumbar",
        type: "company",
        address: "Jl. Padang Baru No.12, Padang",
        email: "hr.witel@telkom.co.id",
        phone: "0751-221000",
        description: "Penyedia jasa layanan telekomunikasi terbesar nasional.",
        status: "active",
        contact: {
          name: "Rudi Hermawan, MBA",
          position: "Manager HR & General Affairs",
          email: "rudi.hermawan@telkom.co.id",
          phone: "0813-1122-3344"
        }
      },
      {
        name: "Yayasan IT Kreatif Mandiri",
        type: "ngo",
        address: "Jl. Khatib Sulaiman No.45, Padang",
        email: "contact@itkreatif.org",
        phone: "0751-789333",
        description: "Lembaga swadaya masyarakat pendampingan startup dan talenta digital muda.",
        status: "inactive",
        contact: {
          name: "Faisal Tanjung, S.T.",
          position: "Direktur Eksekutif",
          email: "faisal@itkreatif.org",
          phone: "0852-6677-8899"
        }
      }
    ];

    // 3. Insert partners and their contacts
    for (const p of samplePartners) {
      const [partnerResult] = await db.query(
        `INSERT INTO partners (name, type, address, email, phone, description, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.type, p.address, p.email, p.phone, p.description, p.status]
      );
      const partnerId = partnerResult.insertId;
      console.log(`Created Partner: ${p.name} (ID: ${partnerId})`);

      // Insert contact person
      await db.query(
        `INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [partnerId, p.contact.name, p.contact.position, p.contact.email, p.contact.phone]
      );
      console.log(`Created Contact for ${p.name}: ${p.contact.name}`);
    }

    // 4. Retrieve survey id to link invitation PINs
    const [surveys] = await db.query("SELECT id FROM surveys LIMIT 1");
    if (surveys.length > 0) {
      const surveyId = surveys[0].id;
      // Get inserted partners
      const [insertedPartners] = await db.query("SELECT id FROM partners WHERE status = 'active'");
      
      // Generate some sample PIN invitations
      const samplePins = ["FTI26A", "FTI26B", "FTI26C"];
      for (let i = 0; i < Math.min(insertedPartners.length, samplePins.length); i++) {
        const partnerId = insertedPartners[i].id;
        const pin = samplePins[i];
        
        // Let's make the second one marked as used
        const isUsed = i === 1 ? 1 : 0;
        const usedAt = isUsed === 1 ? new Date() : null;

        await db.query(
          "INSERT INTO survey_invitations (partner_id, survey_id, pin, is_used, used_at) VALUES (?, ?, ?, ?, ?)",
          [partnerId, surveyId, pin, isUsed, usedAt]
        );
        console.log(`Generated Invitation PIN for Partner ID ${partnerId}: ${pin} (Status: ${isUsed ? 'used' : 'active'})`);
      }
    }

    console.log("Partner database seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding partner database:", err);
    process.exit(1);
  }
}

seed();
