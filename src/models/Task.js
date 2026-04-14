const mongoose = require("mongoose");
const { TASK_STATUS } = require("../utils/constants");

const taskUpdateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      required: true
    },
    message: {
      type: String,
      trim: true,
      default: ""
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.PENDING
    },
    deadline: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    },
    updates: [taskUpdateSchema]
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("Task", taskSchema);
