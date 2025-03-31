const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const refreshTokenSchema = new Schema({
  token: { type: String, require: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  expiredDate: { type: Date, require: true },
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
