const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'facultyware'
    });

    await db.query('DROP TABLE IF EXISTS partner_contacts');
    await db.query(`
      CREATE TABLE IF NOT EXISTS partner_contacts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        partner_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255) NULL DEFAULT NULL,
        email VARCHAR(255) NULL DEFAULT NULL,
        phone VARCHAR(255) NULL DEFAULT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT '0',
        notes TEXT NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        INDEX partner_contacts_partner_id_foreign (partner_id ASC) VISIBLE,
        CONSTRAINT partner_contacts_partner_id_foreign FOREIGN KEY (partner_id) REFERENCES partners (id) ON DELETE CASCADE
      )
    `);

    // Insert dummy contacts for our seed partners
    const [partners] = await db.query("SELECT id FROM partners LIMIT 2");
    if (partners.length > 0) {
      await db.query(
        "INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, 1)",
        [partners[0].id, "Budi Santoso, M.T.", "Kepala Departemen SDM & Diklat", "budi.santoso@semenpadang.co.id", "0812-3456-7890"]
      );
      if (partners.length > 1) {
        await db.query(
          "INSERT INTO partner_contacts (partner_id, name, position, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, 1)",
          [partners[1].id, "Sri Wahyuni, S.Kom.", "Kepala Bidang Aplikasi Informatika", "sri.wahyuni@sumbarprov.go.id", "0811-9876-5432"]
        );
      }
    }

    console.log('Created partner_contacts and inserted contacts');
    db.end();
  } catch (err) {
    console.error(err);
  }
}

run();
