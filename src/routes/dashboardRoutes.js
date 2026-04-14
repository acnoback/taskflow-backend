const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);
router.get("/feed", dashboardController.feedValidation, validateRequest, dashboardController.getActivityFeed);
router.get("/summary", dashboardController.getDashboardSummary);

module.exports = router;
