const { createError } = require("../services/createError.service");
const { createRecurringJob } = require("../services/schedule.service");
const { checkRequiredFields } = require("../utils/HelperFunctions");
const { tryCatch } = require("../utils/tryCatch");

const createRecurringScheduledJob = tryCatch(async (req, res) => {
  const { jobType, repeatInterval, referenceId } = req.body;

  let requiredFields = ["jobType", "repeatInterval"];
  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  const newJob = await createRecurringJob({
    jobType,
    repeatInterval,
    referenceId,
  });
  return res.status(201).json({
    message: "Recurring job created successfully",
    data: newJob,
  });
});
module.exports = {
  createRecurringScheduledJob,
};
