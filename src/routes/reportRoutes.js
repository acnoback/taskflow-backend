const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);
router.get("/", reportController.listReportsValidation, validateRequest, reportController.listReports);
router.post("/", reportController.createReportValidation, validateRequest, reportController.createReport);

module.exports = router;
