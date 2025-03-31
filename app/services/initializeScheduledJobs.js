const scheduledJobsModel = require("../models/scheduledJobs.model");
const { devConsLogger, devErrorLogger } = require("../utils/devLogger");
const {
  scheduleJobExecution,
  executeOneTimeJobHandler,
  executeRecurringJobHandler,
} = require("./schedule.service");

const initializeScheduledJobs = async () => {
  try {
    const now = new Date();
    const scheduledJobs = await scheduledJobsModel
      .find({ status: "scheduled" })
      .sort({ scheduleTime: 1 });

    const onetimeJobCount = await scheduledJobsModel.countDocuments({
      status: "scheduled",
      type: "one-time",
    });
    const recurringJobCount = await scheduledJobsModel.countDocuments({
      status: "scheduled",
      type: "recurring",
    });
    const totalJobCount = await scheduledJobsModel.countDocuments({
      status: "scheduled",
    });
    if (scheduledJobs.length === 0) {
      devConsLogger("No jobs available!");
      return;
    }

    scheduledJobs.forEach((job) => {
      if (new Date(job.scheduleTime) < now) {
        devConsLogger(`Executing missed job immediately: ${job._id}`);
        if (job.type === "one-time") {
          executeOneTimeJobHandler(job);
        } else if (job.type === "recurring") {
          executeRecurringJobHandler(job);
        }
      } else {
        scheduleJobExecution(job);
      }
    });

    let responseMessage = `Initialized ${recurringJobCount} recurring jobs and ${onetimeJobCount} one-time jobs. Total jobs: ${totalJobCount}.`;
    if (recurringJobCount > 0 && onetimeJobCount === 0) {
      responseMessage = `Initialized ${recurringJobCount} recurring jobs. 0 one-time jobs. Total jobs: ${totalJobCount}.`;
    } else if (onetimeJobCount > 0 && recurringJobCount === 0) {
      responseMessage = `Initialized ${onetimeJobCount} one-time jobs. 0 recurring jobs. Total jobs: ${totalJobCount}.`;
    }
    devConsLogger(responseMessage);
  } catch (error) {
    devErrorLogger("Error when initializing scheduled jobs:", error);
  }
};

module.exports = initializeScheduledJobs;
