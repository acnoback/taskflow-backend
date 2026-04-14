const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDb } = require("./config/db");
const env = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { ensureHeadUser } = require("./services/seedService");
const { startTaskCleanupScheduler } = require("./services/scheduler");

async function startServer() {
  await connectDb();
  await ensureHeadUser();
  startTaskCleanupScheduler();

  const app = express();
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(errorHandler);

  const server = app.listen(env.port, env.host, () => {
    console.log(`[server] listening on http://${env.host}:${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (error) => {
    console.error("[server] unhandled rejection", error);
  });
  process.on("uncaughtException", (error) => {
    console.error("[server] uncaught exception", error);
  });
}

startServer().catch((error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
