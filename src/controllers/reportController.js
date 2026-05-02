const { body, query } = require("express-validator");
const Report = require("../models/Report");
const Task = require("../models/Task");
const Message = require("../models/Message");
const ApiError = require("../utils/ApiError");
const { MESSAGE_TYPES, REFERENCE_TYPES, ROLES } = require("../utils/constants");
const { logActivity } = require("../services/activityService");

const listReportsValidation = [
  query("departmentId").optional().isMongoId(),
  query("taskId").optional().isMongoId()
];

async function listReports(req, res, next) {
  try {
    const filter = {};

    if (req.user.role !== ROLES.HEAD) {
      filter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    if (req.query.taskId) {
      filter.taskId = req.query.taskId;
    }

    const reports = await Report.find(filter)
      .populate("departmentId", "name code")
      .populate("reportedBy", "fullName username role")
      .populate("assignedBy", "fullName username role")
      .populate("taskId", "title deadline status")
      .sort({ reportedAt: -1 });

    res.json({ reports });
  } catch (error) {
    next(error);
  }
}

const createReportValidation = [
  body("title").trim().notEmpty(),
  body("description").optional().isString(),
  body("status").trim().notEmpty(),
  body("departmentId").isMongoId(),
  body("taskId").optional({ nullable: true }).isMongoId(),
  body("deadline").optional({ nullable: true }).isISO8601()
];

async function createReport(req, res, next) {
  try {
    const { title, description, status, departmentId, taskId, deadline } = req.body;

    if (req.user.role !== ROLES.HEAD && String(req.user.departmentId) !== String(departmentId)) {
      throw new ApiError(403, "You can only create reports for your department");
    }

    let task = null;
    if (taskId) {
      task = await Task.findById(taskId);
      if (!task || String(task.departmentId) !== String(departmentId)) {
        throw new ApiError(404, "Task not found in this department");
      }
    }

    const now = new Date();
    const report = await Report.create({
      title,
      description: description || "",
      status,
      departmentId,
      taskId: task?._id || null,
      reportedBy: req.user._id,
      assignedBy: task?.assignedBy || null,
      deadline: deadline || task?.deadline || null,
      timeline: [
        { label: "Created", timestamp: task?.createdAt || now },
        { label: status, timestamp: now }
      ],
      reportedAt: now
    });

    await Message.create({
      departmentId,
      senderId: req.user._id,
      type: MESSAGE_TYPES.REPORT_CREATED,
      text: description || `Report created: ${title}`,
      reportId: report._id,
      taskId: task?._id || null,
      referenceType: REFERENCE_TYPES.REPORT,
      referenceId: report._id.toString(),
      referenceTitle: title,
      referencePreview: status,
      sentAt: now
    });

    await logActivity({
      type: "REPORT_CREATED",
      message: `${req.user.fullName} created report "${title}"`,
      actorId: req.user._id,
      departmentId,
      taskId: task?._id || null,
      visibility: req.user.role === ROLES.HEAD ? "GLOBAL" : "DEPARTMENT",
      metadata: { reportId: report._id, status }
    });

    res.status(201).json({ message: "Report created successfully", report });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listReportsValidation,
  listReports,
  createReportValidation,
  createReport
};
