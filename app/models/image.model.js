const mongoose = require("mongoose");
const { getExpirationDate } = require("../utils/ProductHelperFunctions");
const Schema = mongoose.Schema;

const imageSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
    required: true,
  },
  folder: {
    type: String,
    required: true,
  },
  isInUse: { type: Boolean, default: false },
  deleteAt: {
    type: Date,
    required: true,
    default: getExpirationDate(7),
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("Image", imageSchema);
