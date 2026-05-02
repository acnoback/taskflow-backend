const { body } = require("express-validator");
const Department = require("../models/Department");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../utils/constants");
const { logActivity } = require("../services/activityService");

const createDepartmentValidation = [
  body("name").trim().notEmpty(),
  body("code").trim().notEmpty()
];

async function createDepartment(req, res, next) {
  try {
    const { name, code } = req.body;
    const normalizedCode = code.trim().toUpperCase();

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { code: normalizedCode }]
    });

    if (existing) {
      throw new ApiError(409, "Department name or code already exists");
    }

    const department = await Department.create({
      name: name.trim(),
      code: normalizedCode
    });

    await logActivity({
      type: "DEPARTMENT_CREATED",
      message: `${req.user.fullName} created ${department.name}`,
      actorId: req.user._id,
      departmentId: department._id,
      visibility: "GLOBAL",
      metadata: { departmentId: department._id }
    });

    res.status(201).json({ message: "Department created successfully", department });
  } catch (error) {
    next(error);
  }
}

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

module.exports = {
  createDepartmentValidation,
  createDepartment,
  listDepartments
};
