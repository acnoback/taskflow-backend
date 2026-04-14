const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const Department = require("../models/Department");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      departmentId: user.departmentId ? user.departmentId.toString() : null
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

const loginValidation = [
  body("username").trim().notEmpty(),
  body("password").isString().notEmpty()
];

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate("departmentId");

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, "Invalid username or password");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account disabled");
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        department: user.departmentId
          ? {
              id: user.departmentId._id,
              name: user.departmentId.name,
              code: user.departmentId.code
            }
          : null,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    next(error);
  }
}

const changePasswordValidation = [
  body("currentPassword").isString().notEmpty(),
  body("newPassword").isLength({ min: 8 }),
  body("newUsername").optional().trim().isLength({ min: 3 })
];

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, newUsername } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, "Current password is incorrect");
    }

    if (user.role === "HEAD" && user.mustChangePassword && !newUsername?.trim()) {
      throw new ApiError(400, "Please choose your preferred username during first-time setup");
    }

    const normalizedUsername = newUsername?.trim();

    if (normalizedUsername && normalizedUsername !== user.username) {
      const existing = await User.findOne({ username: normalizedUsername });
      if (existing) {
        throw new ApiError(409, "Username already exists");
      }
      user.username = normalizedUsername;
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Credentials updated successfully" });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate("departmentId");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        department: user.departmentId
          ? {
              id: user.departmentId._id,
              name: user.departmentId.name,
              code: user.departmentId.code
            }
          : null,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    next(error);
  }
}

async function bootstrap(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const totalDepartments = await Department.countDocuments();

    res.json({
      totalUsers,
      totalDepartments,
      pollingMinutes: env.pollingMinutes
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  loginValidation,
  login,
  changePasswordValidation,
  changePassword,
  me,
  bootstrap
};
