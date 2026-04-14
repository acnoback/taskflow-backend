const Department = require("../models/Department");
const { ROLES } = require("../utils/constants");

async function listDepartments(req, res, next) {
  try {
    const filter = req.user.role === ROLES.HEAD ? {} : { _id: req.user.departmentId };
    const departments = await Department.find(filter)
      .populate("adminId", "fullName username")
      .sort({ name: 1 });

    res.json({ departments });
  } catch (error) {
    next(error);
  }
}

module.exports = { listDepartments };
