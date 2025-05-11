const express = require("express");
const {
  createRecurringScheduledJob,
} = require("../../controllers/scheduleJob.controller");

const router = express.Router();

router.post("/", createRecurringScheduledJob);

module.exports = router;
