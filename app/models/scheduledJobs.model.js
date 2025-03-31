const mongoose = require("mongoose");

const scheduledJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["one-time", "recurring"],
      default: "one-time",
      required: true,
    },
    jobId: { type: String, required: true, unique: true },
    jobType: { type: String, required: true },
    referenceId: { type: String, default: "" },
    scheduleTime: { type: Date, required: true },
    repeatInterval: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ScheduledJob", scheduledJobSchema);
