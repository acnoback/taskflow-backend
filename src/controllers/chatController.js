const { body, param } = require("express-validator");
const Department = require("../models/Department");
const Message = require("../models/Message");
const Task = require("../models/Task");
const Report = require("../models/Report");
const ApiError = require("../utils/ApiError");
const { ROLES, MESSAGE_TYPES } = require("../utils/constants");
const { logActivity } = require("../services/activityService");

async function ensureDepartmentAccess(user, departmentId) {
  if (user.role === ROLES.HEAD) return;
  if (String(user.departmentId) !== String(departmentId)) {
    throw new ApiError(403, "You do not have access to this department");
  }
}

const listMessagesValidation = [param("departmentId").isMongoId()];

async function listMessages(req, res, next) {
  try {
    const { departmentId } = req.params;
    await ensureDepartmentAccess(req.user, departmentId);

    const messages = await Message.find({ departmentId })
      .populate("senderId", "fullName username role")
      .populate("replyToMessageId", "text type referenceTitle referencePreview")
      .populate("taskId")
      .populate("reportId")
      .sort({ sentAt: 1 });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

const createMessageValidation = [
  param("departmentId").isMongoId(),
  body("text").optional().isString(),
  body("type").optional().isIn(Object.values(MESSAGE_TYPES)),
  body("taskId").optional({ nullable: true }).isMongoId(),
  body("reportId").optional({ nullable: true }).isMongoId(),
  body("replyToMessageId").optional({ nullable: true }).isMongoId(),
  body("referenceType").optional({ nullable: true }).isString(),
  body("referenceId").optional({ nullable: true }).isString(),
  body("referenceTitle").optional({ nullable: true }).isString(),
  body("referencePreview").optional({ nullable: true }).isString()
];

async function createMessage(req, res, next) {
  try {
    const { departmentId } = req.params;
    await ensureDepartmentAccess(req.user, departmentId);

    const department = await Department.findById(departmentId);
    if (!department) {
      throw new ApiError(404, "Department not found");
    }

    const payload = {
      departmentId,
      senderId: req.user._id,
      type: req.body.type || MESSAGE_TYPES.TEXT,
      text: req.body.text || "",
      taskId: req.body.taskId || null,
      reportId: req.body.reportId || null,
      replyToMessageId: req.body.replyToMessageId || null,
      referenceType: req.body.referenceType || null,
      referenceId: req.body.referenceId || null,
      referenceTitle: req.body.referenceTitle || "",
      referencePreview: req.body.referencePreview || "",
      sentAt: new Date()
    };

    if (!payload.text && !payload.taskId && !payload.reportId) {
      throw new ApiError(400, "Message content is required");
    }

    if (payload.taskId) {
      const task = await Task.findById(payload.taskId);
      if (!task || String(task.departmentId) !== String(departmentId)) {
        throw new ApiError(404, "Task not found in this department");
      }
    }

    if (payload.reportId) {
      const report = await Report.findById(payload.reportId);
      if (!report || String(report.departmentId) !== String(departmentId)) {
        throw new ApiError(404, "Report not found in this department");
      }
    }

    const message = await Message.create(payload);
    await message.populate("senderId", "fullName username role");
    await message.populate("replyToMessageId", "text type referenceTitle referencePreview");
    await message.populate("taskId");
    await message.populate("reportId");

    await logActivity({
      type: "CHAT_MESSAGE",
      message: `${req.user.fullName} posted in ${department.name}`,
      actorId: req.user._id,
      departmentId,
      visibility: req.user.role === ROLES.HEAD ? "GLOBAL" : "DEPARTMENT",
      metadata: { messageType: payload.type }
    });

    res.status(201).json({ message: "Message sent successfully", data: message });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMessagesValidation,
  listMessages,
  createMessageValidation,
  createMessage
};
