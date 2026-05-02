const express = require("express");
const userController = require("../controllers/userController");
const { authenticate, allowRoles } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(authenticate);
router.get("/", userController.listUsersValidation, validateRequest, userController.listUsers);
router.post(
  "/admin",
  allowRoles(ROLES.HEAD),
  userController.createAdminValidation,
  validateRequest,
  userController.createAdmin
);
router.post(
  "/admins",
  allowRoles(ROLES.HEAD),
  userController.createAdminValidation,
  validateRequest,
  userController.createAdmin
);
router.delete(
  "/admins/:adminId",
  allowRoles(ROLES.HEAD),
  userController.removeAdminValidation,
  validateRequest,
  userController.removeAdmin
);
router.post(
  "/user",
  allowRoles(ROLES.HEAD, ROLES.ADMIN),
  userController.createUserValidation,
  validateRequest,
  userController.createUser
);
router.post(
  "/users",
  allowRoles(ROLES.HEAD, ROLES.ADMIN),
  userController.createUserValidation,
  validateRequest,
  userController.createUser
);
router.delete(
  "/:userId",
  allowRoles(ROLES.HEAD, ROLES.ADMIN),
  userController.manageUserValidation,
  validateRequest,
  userController.deleteUser
);
router.delete(
  "/users/:userId",
  allowRoles(ROLES.HEAD, ROLES.ADMIN),
  userController.manageUserValidation,
  validateRequest,
  userController.deleteUser
);

module.exports = router;
