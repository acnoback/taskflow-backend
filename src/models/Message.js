const mongoose = require("mongoose");
const { MESSAGE_TYPES, REFERENCE_TYPES } = require("../utils/constants");

const messageSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      default: MESSAGE_TYPES.TEXT
    },
    text: {
      type: String,
      trim: true,
      default: ""
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null
    },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    referenceType: {
      type: String,
      enum: [...Object.values(REFERENCE_TYPES), null],
      default: null
    },
    referenceId: {
      type: String,
      default: null
    },
    referenceTitle: {
      type: String,
      trim: true,
      default: ""
    },
    referencePreview: {
      type: String,
      trim: true,
      default: ""
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }
  }
);

module.exports = mongoose.model("Message", messageSchema);
