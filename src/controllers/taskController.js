const { body, param, query } = require("express-validator");
const Task = require("../models/Task");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { ROLES, TASK_STATUS } = require("../utils/constants");
const { logActivity } = require("../services/activityService");

const createTaskValidation = [
  body("title").trim().notEmpty(),
  body("description").optional().isString(),
  body("assignedTo").isArray({ min: 1 }),
  body("assignedTo.*").isMongoId(),
  body("deadline").optional({ nullable: true }).isISO8601()
];

async function createTask(req, res, next) {
  try {
    const { title, description, assignedTo, deadline } = req.body;

    const users = await User.find({
      _id: { $in: assignedTo },
      role: ROLES.USER,
      departmentId: req.user.departmentId,
      isActive: true
    });

    if (users.length !== assignedTo.length) {
      throw new ApiError(400, "All assigned users must be active users in your department");
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      departmentId: req.user.departmentId,
      deadline: deadline || null,
      updates: [
        {
          status: TASK_STATUS.PENDING,
          message: "Task assigned",
          updatedBy: req.user._id,
          timestamp: new Date()
        }
      ]
    });

    await logActivity({
      type: "TASK_CREATED",
      message: `${req.user.fullName} assigned "${title}" to ${users.length} user(s)`,
      actorId: req.user._id,
      departmentId: req.user.departmentId,
      taskId: task._id,
      visibility: "DEPARTMENT",
      metadata: { assignedUserIds: assignedTo, taskTitle: title }
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    next(error);
  }
}

const listTasksValidation = [
  query("status").optional().isString(),
  query("assignedUserId").optional().isMongoId(),
  query("updatedSince").optional().isISO8601()
];

async function listTasks(req, res, next) {
  try {
    const filter = {};

    if (req.user.role === ROLES.ADMIN) {
      filter.departmentId = req.user.departmentId;
    } else if (req.user.role === ROLES.USER) {
      filter.assignedTo = req.user._id;
      filter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.assignedUserId) {
      filter.assignedTo = req.query.assignedUserId;
    }

    if (req.query.updatedSince) {
      filter.updatedAt = { $gte: new Date(req.query.updatedSince) };
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "fullName username departmentId")
      .populate("assignedBy", "fullName username")
      .sort({ updatedAt: -1 });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
}

const updateTaskValidation = [
  param("taskId").isMongoId(),
  body("status").isIn(Object.values(TASK_STATUS)),
  body("message").optional().isString()
];

async function updateTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const { status, message = "" } = req.body;
    const task = await Task.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    if (req.user.role === ROLES.USER) {
      const assigned = task.assignedTo.some((userId) => String(userId) === String(req.user._id));
      if (!assigned) {
        throw new ApiError(403, "You can only update tasks assigned to you");
      }
    } else if (req.user.role === ROLES.ADMIN && String(task.departmentId) !== String(req.user.departmentId)) {
      throw new ApiError(403, "You can only update tasks in your department");
    }

    task.status = status;
    task.updates.push({
      status,
      message,
      updatedBy: req.user._id,
      timestamp: new Date()
    });
    task.completedAt = status === TASK_STATUS.COMPLETED ? new Date() : null;
    task.archived = false;
    await task.save();

    const activityType = req.user.role === ROLES.USER ? "TASK_REPORTED" : "TASK_UPDATED";

    await logActivity({
      type: activityType,
      message:
        req.user.role === ROLES.USER
          ? `${req.user.fullName} reported "${task.title}" as ${status}`
          : `${req.user.fullName} changed "${task.title}" to ${status}`,
      actorId: req.user._id,
      departmentId: task.departmentId,
      taskId: task._id,
      visibility: "DEPARTMENT",
      metadata: {
        status,
        note: message,
        taskTitle: task.title,
        reporterRole: req.user.role
      }
    });

    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    next(error);
  }
}

const deleteTaskValidation = [param("taskId").isMongoId()];

async function deleteTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    if (req.user.role !== ROLES.ADMIN || String(task.departmentId) !== String(req.user.departmentId)) {
      throw new ApiError(403, "Only the department admin can delete this task");
    }

    await Task.deleteOne({ _id: task._id });

    await logActivity({
      type: "TASK_DELETED",
      message: `${req.user.fullName} deleted "${task.title}"`,
      actorId: req.user._id,
      departmentId: task.departmentId,
      taskId: task._id,
      visibility: "DEPARTMENT"
    });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTaskValidation,
  createTask,
  listTasksValidation,
  listTasks,
  updateTaskValidation,
  updateTask,
  deleteTaskValidation,
  deleteTask
};
