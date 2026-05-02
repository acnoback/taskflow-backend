const express = require("express");
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);
router.get(
  "/:departmentId/messages",
  chatController.listMessagesValidation,
  validateRequest,
  chatController.listMessages
);
router.post(
  "/:departmentId/messages",
  chatController.createMessageValidation,
  validateRequest,
  chatController.createMessage
);

module.exports = router;
