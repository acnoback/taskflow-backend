const Department = require("../models/Department");
const User = require("../models/User");
const env = require("../config/env");
const { ROLES } = require("../utils/constants");

async function ensureHeadUser() {
  const existingHead = await User.findOne({ role: ROLES.HEAD });

  if (existingHead) {
    console.log(`[seed] head user already exists: ${existingHead.username}`);
    return existingHead;
  }

  const sharedDepartment = await Department.findOneAndUpdate(
    { code: "HQ" },
    { name: "Head Office", code: "HQ" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const passwordHash = await User.hashPassword(env.headPassword);

  const head = await User.create({
    fullName: env.headName,
    username: env.headUsername,
    passwordHash,
    role: ROLES.HEAD,
    departmentId: sharedDepartment._id,
    mustChangePassword: true,
    isActive: true
  });

  console.log(`[seed] created head user: ${env.headUsername}`);
  return head;
}

module.exports = { ensureHeadUser };
