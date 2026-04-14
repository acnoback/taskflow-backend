const { query } = require("express-validator");
const Activity = require("../models/Activity");
const Department = require("../models/Department");
const Task = require("../models/Task");
const User = require("../models/User");
const { ROLES } = require("../utils/constants");

const feedValidation = [
  query("updatedSince").optional().isISO8601(),
  query("type").optional().isString(),
  query("actorRole").optional().isString()
];

async function getActivityFeed(req, res, next) {
  try {
    const filter = {};

    if (req.user.role !== ROLES.HEAD) {
      filter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    if (req.query.updatedSince) {
      filter.createdAt = { $gte: new Date(req.query.updatedSince) };
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    let activities = await Activity.find(filter)
      .populate("actorId", "fullName username role")
      .sort({ createdAt: -1 })
      .limit(100);

    if (req.query.actorRole) {
      activities = activities.filter((activity) => activity.actorId?.role === req.query.actorRole);
    }

    res.json({ activities });
  } catch (error) {
    next(error);
  }
}

async function getDashboardSummary(req, res, next) {
  try {
    const departmentFilter = req.user.role === ROLES.HEAD ? {} : { departmentId: req.user.departmentId };
    const userFilter = req.user.role === ROLES.HEAD ? {} : { departmentId: req.user.departmentId };

    const [departments, admins, users, tasks, completedTasks, overdueTasks] = await Promise.all([
      Department.countDocuments(req.user.role === ROLES.HEAD ? {} : { _id: req.user.departmentId }),
      User.countDocuments({ ...userFilter, role: ROLES.ADMIN }),
      User.countDocuments({ ...userFilter, role: ROLES.USER }),
      Task.countDocuments(departmentFilter),
      Task.countDocuments({ ...departmentFilter, status: "Completed" }),
      Task.countDocuments({
        ...departmentFilter,
        deadline: { $lt: new Date() },
        status: { $ne: "Completed" }
      })
    ]);

    res.json({
      departments,
      admins,
      users,
      tasks,
      completedTasks,
      overdueTasks
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  feedValidation,
  getActivityFeed,
  getDashboardSummary
};
