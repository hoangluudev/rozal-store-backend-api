const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emailOTPSchema = new Schema({
  email: {
    type: String,
    unique: true,
    require: true,
  },
  otpCode: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
  expiredAt: {
    type: Date,
    require: true,
  },
});

module.exports = mongoose.model("EmailOTP", emailOTPSchema);
