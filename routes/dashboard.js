const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const questionController = require("../controllers/questionController");
const partnerController = require("../controllers/partnerController");
const recapController = require("../controllers/recapController");
const { isAdmin } = require("../middlewares/auth");


router.get("/dashboard", isAdmin, dashboardController.showDashboard);


router.post("/generate-pin", isAdmin, dashboardController.generatePIN);


router.get("/dashboard/export-pdf", isAdmin, dashboardController.exportDashboardPDF);


router.get("/questions", isAdmin, questionController.showQuestionsPage);
router.get("/questions/export-pdf", isAdmin, questionController.exportQuestionsPDF);
router.post("/questions", isAdmin, questionController.createQuestion);
router.post("/questions/:id/update", isAdmin, questionController.updateQuestion);
router.post("/questions/:id/delete", isAdmin, questionController.deleteQuestion);
router.delete("/questions/:id", isAdmin, questionController.deleteQuestion);


router.get("/partners", isAdmin, partnerController.showPartnersPage);
router.post("/partners", isAdmin, partnerController.createPartner);
router.get("/partners/:id", isAdmin, partnerController.showPartnerDetailPage);
router.post("/partners/:id/update", isAdmin, partnerController.updatePartner);
router.post("/partners/:id/delete", isAdmin, partnerController.deletePartner);
router.delete("/partners/:id", isAdmin, partnerController.deletePartner);


router.post("/partners/:id/contacts", isAdmin, partnerController.addPartnerContact);
router.delete("/partners/contacts/:contactId", isAdmin, partnerController.deletePartnerContact);


router.get("/partners/:id/export-pdf", isAdmin, partnerController.exportPartnerPDF);


router.get("/recap-answers", isAdmin, recapController.showRecapPage);
router.get("/recap-answers/export-excel", isAdmin, recapController.exportExcel);
router.get("/recap-answers/:id/json", isAdmin, recapController.getResponseDetailJSON);

module.exports = router;
