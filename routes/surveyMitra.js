const express = require("express");
const router = express.Router();
const surveyMitraController = require("../controllers/surveyMitraController");
const { isMitra } = require("../middlewares/authMitra");

// Partner survey routes (all protected by isMitra check)
router.get("/", isMitra, surveyMitraController.showSurveyPage);
router.post("/submit", isMitra, surveyMitraController.submitSurvey);
router.get("/success", isMitra, surveyMitraController.showSuccessPage);

module.exports = router;
