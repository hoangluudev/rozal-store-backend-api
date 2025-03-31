const schedule = require("node-schedule");
const randtoken = require("rand-token");
const cronParser = require("cron-parser");
const moment = require("moment");
const scheduledJobsModel = require("../models/scheduledJobs.model");
const { createError } = require("./createError.service");
const {
  cancelOrder,
  updateProductRating,
  updateProductSale,
} = require("./scheduleTasks.service");
const { devConsLogger, devErrorLogger } = require("../utils/devLogger");

const activeJobs = {};

const getNextRecurringScheduleTime = (repeatInterval) => {
  try {
    if (typeof repeatInterval === "string") {
      const interval = cronParser.parseExpression(repeatInterval);
      return interval.next().toDate();
    } else if (typeof repeatInterval === "object") {
      const { minutes = 0, hours = 0, days = 0 } = repeatInterval;
      return moment().add({ days, hours, minutes }).toDate();
    } else {
      throw new Error("Invalid repeatInterval format.");
    }
  } catch (error) {
    devErrorLogger("Error in getNextRecurringScheduleTime:", error);
    return null;
  }
};
// Common job handler logic
const executeCommonJobHandler = async (job) => {
  switch (job.jobType) {
    case "publish_product":
      devConsLogger(`Publishing product with reference ID: ${job.referenceId}`);
      break;
    case "cancel_order":
      await cancelOrder(job.referenceId);
      break;
    case "update_product_rating_and_sale":
      await updateProductRating();
      await updateProductSale();
      break;
    default:
      devConsLogger(`Unknown job type: ${job.jobType}. ID: ${job.jobId}`);
      break;
  }
};
// Create one-time job
const createOneTimeJob = async (jobData) => {
  try {
    const { jobType, scheduleTime, referenceId } = jobData;

    if (!jobType || !scheduleTime) {
      return createError(400, "Missing required fields!");
    }

    const randomToken = randtoken.generate(6).toUpperCase();
    const newJobId = `${moment().format("YYMMDD")}_${randomToken}`;

    const newJob = await scheduledJobsModel.create({
      jobId: newJobId,
      jobType,
      type: "one-time",
      scheduleTime,
      repeatInterval: null,
      referenceId,
      status: "scheduled",
    });

    scheduleJobExecution(newJob);
    devConsLogger(
      `Created one-time job ${newJobId}, scheduled at ${scheduleTime}`
    );
    return newJob;
  } catch (error) {
    devErrorLogger("Error creating one-time job:", error);
    throw error;
  }
};
// Create recurring job
const createRecurringJob = async (jobData) => {
  try {
    const { jobType, repeatInterval } = jobData;

    if (!jobType || !repeatInterval) {
      return createError(400, "Missing required fields!");
    }

    const randomToken = randtoken.generate(6).toUpperCase();
    const newJobId = `${moment().format("YYMMDD")}_${randomToken}`;
    const nextScheduleTime = getNextRecurringScheduleTime(repeatInterval);

    const newJob = await scheduledJobsModel.create({
      jobId: newJobId,
      jobType,
      type: "recurring",
      scheduleTime: nextScheduleTime,
      repeatInterval,
      status: "scheduled",
    });

    scheduleJobExecution(newJob);
    devConsLogger(
      `Created recurring job ${newJobId}, scheduled first at ${nextScheduleTime}, interval: ${repeatInterval}`
    );
    return newJob;
  } catch (error) {
    devErrorLogger("Error creating recurring job:", error);
    throw error;
  }
};
// Schedule job handler
const scheduleJobExecution = (job) => {
  if (job.status !== "scheduled") return;

  const jobInstance = schedule.scheduleJob(job.scheduleTime, async () => {
    try {
      if (job.type === "one-time") {
        await executeOneTimeJobHandler(job);
      } else if (job.type === "recurring") {
        await executeRecurringJobHandler(job);
      }
    } catch (error) {
      devErrorLogger(`Failed to execute job ${job.jobId}:`, error);
    }
  });

  activeJobs[job.jobId] = jobInstance;
};
// Handle execution of one-time jobs
const executeOneTimeJobHandler = async (job) => {
  try {
    await executeCommonJobHandler(job);
    job.status = "completed";
    await job.save();
    devConsLogger(`One-time job ${job.jobType}: ${job.jobId} completed.`);
  } catch (error) {
    devErrorLogger(`Error executing one-time job ${job.jobId}:`, error);
  }
};
// Handle execution of recurring jobs
const executeRecurringJobHandler = async (job) => {
  try {
    await executeCommonJobHandler(job);
    const nextScheduleTime = getNextRecurringScheduleTime(job.repeatInterval);
    job.scheduleTime = nextScheduleTime;
    await job.save();
    scheduleJobExecution(job);
    devConsLogger(`Recurring job ${job.jobType}: ${job.jobId} completed.`);
    devConsLogger(
      `Recurring job ${job.jobType}: ${job.jobId} rescheduled to ${nextScheduleTime}.`
    );
  } catch (error) {
    devErrorLogger(`Error executing recurring job ${job.jobId}:`, error);
  }
};
// Cancel a scheduled job
const cancelScheduledJob = async (referenceId) => {
  try {
    const job = await scheduledJobsModel.findOne({ referenceId });

    if (!job) {
      devConsLogger(
        `Scheduled job with reference ID ${referenceId} not found.`
      );
      return;
    }

    const scheduledJob = schedule.scheduledJobs[job.jobId];
    if (scheduledJob) {
      scheduledJob.cancel();
      devConsLogger(`Job with ID ${job.jobId} has been canceled.`);
    } else {
      devConsLogger(`No active scheduled job found for ID ${job.jobId}.`);
    }

    job.status = "cancelled";
    await job.save();
  } catch (error) {
    devErrorLogger(
      `Error canceling job with reference ID ${referenceId}:`,
      error
    );
  }
};

module.exports = {
  createOneTimeJob,
  createRecurringJob,
  scheduleJobExecution,
  executeOneTimeJobHandler,
  executeRecurringJobHandler,
  cancelScheduledJob,
};
