const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  province: String,
  district: String,
  ward: String,
  specificLocation: String,
  fullName: String,
  phone: String,
  isDefault: {
    type: Boolean,
    default: true,
  },
});
const userModel = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "Role",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    fullName: {
      type: String,
      default: function () {
        return this.username;
      },
    },
    phone: {
      type: String,
      default: "",
    },
    birthDate: {
      type: String,
      default: "2000-01-01",
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userModel);
