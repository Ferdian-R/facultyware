const bcrypt = require("bcryptjs");
const db = require("../config/db"); // Use the config/db.js file we created

const index = (req, res) => {
  res.redirect("/login");
};

const home = (req, res) => {
  res.render("home", { title: "Home", user: req.session.username });
};

// Admin Login Page View
const loginPage = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/admin/dashboard");
  }
  res.render("login", { title: "Login | SUKAFTI", activeTab: "admin", error: null });
};

// Mitra Login Page View
const loginPageMitra = (req, res) => {
  if (req.session.partnerId) {
    return res.redirect("/survey-mitra"); // Redirect to client survey page
  }
  res.render("login", { title: "Login Mitra | SUKAFTI", activeTab: "mitra", error: null });
};

// Process Admin Authentication
const login = async (req, res, next) => {
  const { email, password } = req.body;
  const identifier = email || req.body.username; // Support both username or email inputs

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [identifier]
    );

    if (rows.length === 0) {
      return res.render("login", {
        title: "Login | SUKAFTI",
        activeTab: "admin",
        error: "Email/Username atau password salah.",
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        title: "Login | SUKAFTI",
        activeTab: "admin",
        error: "Email/Username atau password salah.",
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = "admin";

    req.session.save((err) => {
      if (err) return next(err);
      res.redirect("/admin/dashboard");
    });
  } catch (err) {
    next(err);
  }
};

// Process Mitra PIN Authentication & Burn Logic
const loginMitra = async (req, res, next) => {
  const { pin } = req.body;

  if (!pin) {
    return res.render("login", {
      title: "Login Mitra | SUKAFTI",
      activeTab: "mitra",
      error: "PIN wajib diisi.",
    });
  }

  try {
    // 1. Fetch PIN details
    const [results] = await db.query(
      `SELECT si.id AS invitation_id, si.pin, si.is_used, si.used_at, si.name AS nama_perusahaan, si.survey_id
       FROM survey_invitations si
       WHERE si.pin = ?`,
      [pin]
    );

    if (results.length === 0) {
      return res.render("login", {
        title: "Login Mitra | SUKAFTI",
        activeTab: "mitra",
        error: "PIN tidak valid. Hubungi administrator FTI.",
      });
    }

    const pinData = results[0];

    // 2. Validate PIN status (single-use check)
    if (pinData.is_used === 1) {
      return res.render("login", {
        title: "Login Mitra | SUKAFTI",
        activeTab: "mitra",
        error: "PIN sudah digunakan. Satu PIN hanya berlaku untuk satu kali pengisian.",
      });
    }

    // Removed PIN burn on login. PIN will be burned upon survey submission instead.

    // 4. Legacy Audit Trail removed (table not in v2 schema)
    
    const [partnerRow] = await db.query("SELECT id FROM partners WHERE name = ? LIMIT 1", [pinData.nama_perusahaan]);
    const partnerId = partnerRow.length > 0 ? partnerRow[0].id : null;

    // 5. Establish session
    req.session.partnerName = pinData.nama_perusahaan;
    req.session.partnerId = partnerId; // Optional now, since responses use survey_invitation_id directly
    req.session.invitationId = pinData.invitation_id;
    req.session.surveyId = pinData.survey_id;
    req.session.role = "mitra";

    req.session.save((err) => {
      if (err) return next(err);
      res.redirect("/survey-mitra");
    });
  } catch (err) {
    next(err);
  }
};

// Logout Handler
const logout = (req, res, next) => {
  const wasMitra = req.session && req.session.partnerId;
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    if (wasMitra) {
      res.redirect("/login-mitra");
    } else {
      res.redirect("/login");
    }
  });
};

module.exports = {
  index,
  home,
  loginPage,
  loginPageMitra,
  login,
  loginMitra,
  logout
};
