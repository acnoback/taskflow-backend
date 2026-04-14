const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || "0.0.0.0",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/taskflow",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  headUsername: process.env.HEAD_USERNAME || "head",
  headPassword: process.env.HEAD_PASSWORD || "Head@123",
  headName: process.env.HEAD_NAME || "Global Head",
  pollingMinutes: Number(process.env.POLLING_MINUTES || 1)
};
