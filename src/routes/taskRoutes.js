const express = require("express");
const taskController = require("../controllers/taskController");
const { authenticate, allowRoles } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(authenticate);
router.get("/", taskController.listTasksValidation, validateRequest, taskController.listTasks);
router.post(
  "/",
  allowRoles(ROLES.ADMIN),
  taskController.createTaskValidation,
  validateRequest,
  taskController.createTask
);
router.patch(
  "/:taskId/status",
  allowRoles(ROLES.ADMIN, ROLES.USER),
  taskController.updateTaskValidation,
  validateRequest,
  taskController.updateTask
);
router.patch(
  "/:taskId/update",
  allowRoles(ROLES.ADMIN, ROLES.USER),
  taskController.updateTaskValidation,
  validateRequest,
  taskController.updateTask
);
router.delete(
  "/:taskId",
  allowRoles(ROLES.ADMIN),
  taskController.deleteTaskValidation,
  validateRequest,
  taskController.deleteTask
);

module.exports = router;
