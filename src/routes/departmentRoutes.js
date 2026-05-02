const express = require("express");
const departmentController = require("../controllers/departmentController");
const { authenticate, allowRoles } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(authenticate);
router.post(
  "/",
  allowRoles(ROLES.HEAD),
  departmentController.createDepartmentValidation,
  validateRequest,
  departmentController.createDepartment
);
router.get("/", departmentController.listDepartments);

module.exports = router;
