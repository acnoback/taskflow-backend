const cron = require("node-cron");
const Task = require("../models/Task");

function startTaskCleanupScheduler() {
  cron.schedule("0 2 * * *", async () => {
    const cutoffDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const archived = await Task.updateMany(
      {
        status: "Completed",
        completedAt: { $lte: cutoffDate },
        archived: false
      },
      { $set: { archived: true } }
    );

    const deleted = await Task.deleteMany({
      status: "Completed",
      completedAt: { $lte: cutoffDate },
      archived: true
    });

    console.log(
      `[scheduler] archived=${archived.modifiedCount} deleted=${deleted.deletedCount} cutoff=${cutoffDate.toISOString()}`
    );
  });
}

module.exports = { startTaskCleanupScheduler };
