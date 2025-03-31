const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAddressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, require: true },
    phone: { type: String, require: true },
    city: { type: String, require: true },
    district: { type: String, require: true },
    ward: { type: String, require: true },
    address: { type: String, require: true },
    label: {
      type: String,
      enum: ["", "Home", "Work"],
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("UserAddress", userAddressSchema);
