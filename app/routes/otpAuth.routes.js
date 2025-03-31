const express = require("express");
const route = express.Router();

const {
  sendOTPEmail,
  verifyOTPAndChangePassword,
} = require("../controllers/sendOTPAuth.controller");

route.post("/send-email-code", sendOTPEmail);
route.post("/change-password", verifyOTPAndChangePassword);

module.exports = route;
