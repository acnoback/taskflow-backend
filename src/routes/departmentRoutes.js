const express = require("express");
const departmentController = require("../controllers/departmentController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.get("/", departmentController.listDepartments);

module.exports = router;
