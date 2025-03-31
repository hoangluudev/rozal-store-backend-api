const express = require("express");
const {
  createRecurringScheduledJob,
} = require("../../controllers/ScheduleJob.controller");

const router = express.Router();

router.post("/", createRecurringScheduledJob);

module.exports = router;
