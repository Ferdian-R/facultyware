const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'facultyware',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    console.log("Connected to database. Deploying schema...");
    const schemaPath = path.join(__dirname, 'schema_survey.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await connection.query(schema);
    console.log("Schema deployed successfully!");
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("Failed to deploy schema:", err);
    process.exit(1);
  }
}

run();
