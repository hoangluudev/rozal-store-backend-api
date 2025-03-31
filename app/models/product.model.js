const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    productCode: { type: String, unique: true, require: true },
    name: { type: String, require: true },
    category: { type: String, require: true },
    brand: { type: String, require: true },
    imgUrl: { type: String, require: true },
    productStatus: {
      type: String,
      default: "Draft",
      enum: ["Active", "Inactive", "Draft"],
    },
    stock: {
      stockQuantity: { type: Number, default: 0 },
      stockStatus: {
        type: String,
        default: "Out Of Stock",
        enum: ["In Stock", "Out Of Stock", "Low On Stock"],
      },
    },
    buyPrice: { type: Number, require: true },
    promotionPrice: { type: Number, default: null },
    description: { type: String },
    forGender: {
      type: String,
      default: "unisex",
      enum: ["men", "women", "unisex"],
    },
    isPopular: { type: Boolean, default: false },
    size: { type: [String], default: [] },
    color: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Product", productSchema);
