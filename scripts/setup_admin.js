const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function setup() {
  try {
    console.log("Checking database connection and tables...");

    // 2. Hash password
    const hashedPassword = await bcrypt.hash("password", 10);

    // 3. Create or update test admin user
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", ["admin@sukafti.com"]);
    let adminUserId;

    if (users.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        ["Administrator", "admin@sukafti.com", hashedPassword]
      );
      adminUserId = insertResult.insertId;
      console.log("Test user 'admin' created with password 'password' and email 'admin@sukafti.com'.");
    } else {
      adminUserId = users[0].id;
      // Update password and email to default
      await db.query(
        "UPDATE users SET name = ?, password = ? WHERE id = ?",
        ["Administrator", hashedPassword, adminUserId]
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

    // 5. Ensure admin user has 'admin' role
    const [userRoles] = await db.query(
      "SELECT * FROM model_has_roles WHERE model_id = ? AND role_id = ? AND model_type = 'App\\Models\\User'",
      [adminUserId, adminRoleId]
    );

    if (userRoles.length === 0) {
      await db.query("INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, 'App\\Models\\User', ?)", [
        adminRoleId,
        adminUserId,
      ]);
      console.log("Role 'admin' assigned to user 'admin'.");
    } else {
      console.log("User 'admin' already has 'admin' role.");
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
