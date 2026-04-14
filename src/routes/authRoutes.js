const express = require("express");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");

const router = express.Router();

router.get("/bootstrap", authController.bootstrap);
router.post("/login", authController.loginValidation, validateRequest, authController.login);
router.get("/me", authenticate, authController.me);
router.post(
  "/change-password",
  authenticate,
  authController.changePasswordValidation,
  validateRequest,
  authController.changePassword
);

module.exports = router;
