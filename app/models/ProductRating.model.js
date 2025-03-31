const mongoose = require("mongoose");

const productRatingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductAlpha",
      required: true,
    },
    content: {
      type: String,
      maxlength: 50,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    helpfulVote: {
      count: { type: Number, default: 0 },
      byUsers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        default: [],
      },
    },
    editAllowedUntil: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ProductRating", productRatingSchema);
