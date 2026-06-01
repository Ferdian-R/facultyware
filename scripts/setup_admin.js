const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function setup() {
  try {
    console.log("Checking database connection and tables...");

    // 1. Add email column to users table if it doesn't exist
    const [columns] = await db.query("SHOW COLUMNS FROM users");
    const hasEmail = columns.some((col) => col.Field === "email");
    if (!hasEmail) {
      await db.query("ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER username");
      console.log("Added 'email' column to 'users' table.");
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash("password", 10);

    // 3. Create or update test admin user
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", ["admin"]);
    let adminUserId;

    if (users.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        ["admin", "admin@sukafti.com", hashedPassword]
      );
      adminUserId = insertResult.insertId;
      console.log("Test user 'admin' created with password 'password' and email 'admin@sukafti.com'.");
    } else {
      adminUserId = users[0].id;
      // Update password and email to default
      await db.query(
        "UPDATE users SET email = ?, password = ? WHERE id = ?",
        ["admin@sukafti.com", hashedPassword, adminUserId]
      );
      console.log("Test user 'admin' updated to password 'password' and email 'admin@sukafti.com'.");
    }

    // 4. Ensure roles table has 'admin'
    const [roles] = await db.query("SELECT * FROM roles WHERE name = ?", ["admin"]);
    let adminRoleId;
    if (roles.length === 0) {
      const [insertRole] = await db.query("INSERT INTO roles (name) VALUES (?)", ["admin"]);
      adminRoleId = insertRole.insertId;
      console.log("Role 'admin' inserted into 'roles' table.");
    } else {
      adminRoleId = roles[0].id;
    }

    // 5. Map admin user to admin role in user_has_roles
    const [mappings] = await db.query(
      "SELECT * FROM user_has_roles WHERE user_id = ? AND role_id = ?",
      [adminUserId, adminRoleId]
    );
    if (mappings.length === 0) {
      await db.query("INSERT INTO user_has_roles (user_id, role_id) VALUES (?, ?)", [
        adminUserId,
        adminRoleId,
      ]);
      console.log("Mapped user 'admin' to role 'admin' in 'user_has_roles'.");
    } else {
      console.log("User 'admin' is already mapped to role 'admin'.");
    }

    console.log("\nSetup complete! You can now log in using:");
    console.log("Username: admin (or Email: admin@sukafti.com)");
    console.log("Password: password");

    process.exit(0);
  } catch (err) {
    console.error("Error setting up admin account:", err);
    process.exit(1);
  }
}

setup();
