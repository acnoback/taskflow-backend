const { body, param, query } = require("express-validator");
const Department = require("../models/Department");
const Task = require("../models/Task");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../utils/constants");
const { logActivity } = require("../services/activityService");

const createAdminValidation = [
  body("fullName").trim().notEmpty(),
  body("username").trim().isLength({ min: 3 }),
  body("password").isLength({ min: 8 }),
  body("departmentName").trim().notEmpty(),
  body("departmentCode").trim().notEmpty()
];

async function createAdmin(req, res, next) {
  try {
    const { fullName, username, password, departmentName, departmentCode } = req.body;
    const exists = await User.findOne({ username });

    if (exists) {
      throw new ApiError(409, "Username already exists");
    }

    const department = await Department.findOneAndUpdate(
      { code: departmentCode.toUpperCase() },
      { name: departmentName, code: departmentCode.toUpperCase() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (department.adminId) {
      throw new ApiError(409, "Department already has an admin");
    }

    const admin = await User.create({
      fullName,
      username,
      passwordHash: await User.hashPassword(password),
      role: ROLES.ADMIN,
      departmentId: department._id,
      createdBy: req.user._id,
      mustChangePassword: true
    });

    department.adminId = admin._id;
    await department.save();

    await logActivity({
      type: "ADMIN_CREATED",
      message: `${req.user.fullName} created admin ${fullName} for ${department.name}`,
      actorId: req.user._id,
      departmentId: department._id,
      visibility: "GLOBAL",
      metadata: { adminId: admin._id }
    });

    res.status(201).json({ message: "Admin created successfully", admin, department });
  } catch (error) {
    next(error);
  }
}

const createUserValidation = [
  body("fullName").trim().notEmpty(),
  body("username").trim().isLength({ min: 3 }),
  body("password").isLength({ min: 8 }),
  body("departmentId").optional().isMongoId()
];

async function createUser(req, res, next) {
  try {
    const { fullName, username, password } = req.body;
    const existing = await User.findOne({ username });

    if (existing) {
      throw new ApiError(409, "Username already exists");
    }

    let departmentId = req.body.departmentId || req.user.departmentId;

    if (req.user.role === ROLES.ADMIN && req.body.departmentId && req.body.departmentId !== String(req.user.departmentId)) {
      throw new ApiError(403, "Admins can only create users in their own department");
    }

    if (!departmentId) {
      throw new ApiError(400, "Department is required");
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, "Department not found");
    }

    const user = await User.create({
      fullName,
      username,
      passwordHash: await User.hashPassword(password),
      role: ROLES.USER,
      departmentId,
      createdBy: req.user._id,
      mustChangePassword: true
    });

    await logActivity({
      type: "USER_CREATED",
      message: `${req.user.fullName} created user ${fullName}`,
      actorId: req.user._id,
      departmentId,
      visibility: req.user.role === ROLES.HEAD ? "GLOBAL" : "DEPARTMENT",
      metadata: { userId: user._id }
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    next(error);
  }
}

const listUsersValidation = [query("search").optional().isString()];

async function listUsers(req, res, next) {
  try {
    const search = (req.query.search || "").trim();
    const filter = { isActive: true };

    if (req.user.role !== ROLES.HEAD) {
      filter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

const removeAdminValidation = [
  param("adminId").isMongoId(),
  body("mode").isIn(["DELETE_ALL", "REASSIGN"]),
  body("reassignAdminId").optional().isMongoId()
];

async function removeAdmin(req, res, next) {
  try {
    const { adminId } = req.params;
    const { mode, reassignAdminId } = req.body;
    const admin = await User.findById(adminId);

    if (!admin || admin.role !== ROLES.ADMIN) {
      throw new ApiError(404, "Admin not found");
    }

    const department = await Department.findById(admin.departmentId);
    const departmentUsers = await User.find({ departmentId: admin.departmentId, role: ROLES.USER });
    const userIds = departmentUsers.map((user) => user._id);

    if (mode === "DELETE_ALL") {
      await Task.deleteMany({ departmentId: admin.departmentId });
      await User.deleteMany({ departmentId: admin.departmentId, role: ROLES.USER });
      await User.deleteOne({ _id: admin._id });
      if (department) {
        await Department.deleteOne({ _id: department._id });
      }
    } else {
      if (!reassignAdminId) {
        throw new ApiError(400, "Replacement admin is required for reassignment");
      }

      const newAdmin = await User.findById(reassignAdminId);

      if (!newAdmin || newAdmin.role !== ROLES.ADMIN) {
        throw new ApiError(404, "Replacement admin not found");
      }

      await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { departmentId: newAdmin.departmentId, createdBy: newAdmin._id } }
      );

      await Task.updateMany(
        { departmentId: admin.departmentId },
        { $set: { departmentId: newAdmin.departmentId, assignedBy: newAdmin._id } }
      );

      await User.deleteOne({ _id: admin._id });

      if (department) {
        await Department.deleteOne({ _id: department._id });
      }
    }

    await logActivity({
      type: "ADMIN_REMOVED",
      message: `${req.user.fullName} removed admin ${admin.fullName} using ${mode}`,
      actorId: req.user._id,
      departmentId: admin.departmentId,
      visibility: "GLOBAL",
      metadata: { removedAdminId: admin._id, mode }
    });

    res.json({ message: "Admin removed successfully" });
  } catch (error) {
    next(error);
  }
}

const manageUserValidation = [param("userId").isMongoId()];

async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user || user.role !== ROLES.USER) {
      throw new ApiError(404, "User not found");
    }

    if (req.user.role === ROLES.ADMIN && String(user.departmentId) !== String(req.user.departmentId)) {
      throw new ApiError(403, "Cannot remove a user outside your department");
    }

    await Task.updateMany({ assignedTo: user._id }, { $pull: { assignedTo: user._id } });
    await Task.deleteMany({ assignedTo: { $size: 0 } });
    await User.deleteOne({ _id: user._id });

    await logActivity({
      type: "USER_DELETED",
      message: `${req.user.fullName} deleted user ${user.fullName}`,
      actorId: req.user._id,
      departmentId: user.departmentId,
      visibility: req.user.role === ROLES.HEAD ? "GLOBAL" : "DEPARTMENT",
      metadata: { userId: user._id }
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAdminValidation,
  createAdmin,
  createUserValidation,
  createUser,
  listUsersValidation,
  listUsers,
  removeAdminValidation,
  removeAdmin,
  manageUserValidation,
  deleteUser
};
