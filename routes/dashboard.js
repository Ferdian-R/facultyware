const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { isAdmin } = require("../middlewares/auth");

// Admin Dashboard - UI view page
router.get("/dashboard", isAdmin, dashboardController.showDashboard);

// Admin Dashboard - Generate a new PIN
router.post("/generate-pin", isAdmin, dashboardController.generatePIN);

// Admin Dashboard - Export stats report to PDF
router.get("/dashboard/export-pdf", isAdmin, dashboardController.exportDashboardPDF);

module.exports = router;
