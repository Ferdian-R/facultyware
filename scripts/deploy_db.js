const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'facultyware',
      port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
      multipleStatements: true
    });
    
    console.log("Connected to database. Deploying schema...");
    const schemaPath = path.join(__dirname, 'schema_survey.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await connection.query(schema);
    console.log("Schema deployed successfully!");
    
    // Add missing column to partners if not exists
    try {
      await connection.query("ALTER TABLE partners ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
      console.log("is_active column added to partners.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("is_active column already exists, skipping.");
      } else {
        console.warn("Could not add is_active column (might already exist or other error):", e.message);
      }
    }
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("Failed to deploy schema:", err);
    process.exit(1);
  }
}

run();
