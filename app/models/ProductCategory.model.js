const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    avatarImage: {
      type: String,
      default: "",
    },
    productCount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductType",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", categorySchema);
