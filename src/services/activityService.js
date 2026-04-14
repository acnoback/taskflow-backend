const Activity = require("../models/Activity");

async function logActivity({
  type,
  message,
  actorId,
  departmentId = null,
  taskId = null,
  visibility = "DEPARTMENT",
  metadata = {}
}) {
  return Activity.create({
    type,
    message,
    actorId,
    departmentId,
    taskId,
    visibility,
    metadata
  });
}

module.exports = { logActivity };
