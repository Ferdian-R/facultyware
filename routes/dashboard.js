const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const questionController = require("../controllers/questionController");
const { isAdmin } = require("../middlewares/auth");

// Admin Dashboard - UI view page
router.get("/dashboard", isAdmin, dashboardController.showDashboard);

// Admin Dashboard - Generate a new PIN
router.post("/generate-pin", isAdmin, dashboardController.generatePIN);

// Admin Dashboard - Export stats report to PDF
router.get("/dashboard/export-pdf", isAdmin, dashboardController.exportDashboardPDF);

// Admin - Kelola Pertanyaan Survey
router.get("/questions", isAdmin, questionController.showQuestionsPage);
router.get("/questions/export-pdf", isAdmin, questionController.exportQuestionsPDF);
router.post("/questions", isAdmin, questionController.createQuestion);
router.post("/questions/:id/update", isAdmin, questionController.updateQuestion);
router.post("/questions/:id/delete", isAdmin, questionController.deleteQuestion);
router.delete("/questions/:id", isAdmin, questionController.deleteQuestion);

module.exports = router;
