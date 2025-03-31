const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productVariantOptions = new Schema({
  optionName: { type: String, require: true },
  optionValues: [{ type: String, require: true }],
});
const productVariations = new Schema({
  variants: [
    {
      name: { type: String, require: true },
      value: { type: String, require: true },
    },
  ],
  image: { type: String, default: "" },
  quantity: { type: Number, require: true },
  price: { type: Number, require: true },
  comparePrice: { type: Number, require: true },
  sku: { type: String, default: "" },
});

const productSchema = new Schema(
  {
    productCode: { type: String, unique: true, require: true },
    name: { type: String, require: true },
    description: { type: String, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      require: true,
    },
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductType",
      require: true,
    },
    brand: { type: String, require: true },
    gender: {
      type: String,
      require: true,
      enum: ["men", "women", "unisex"],
    },
    avatarImage: { type: String, default: "" },
    images: { type: [String], default: [] },
    prices: {
      price: { type: Number, require: true },
      comparePrice: { type: Number, require: true },
      discount: { type: Number, require: true },
    },
    status: {
      type: String,
      default: "Coming Soon",
      enum: ["Selling", "Sold Out", "Discontinued", "Coming Soon"],
    },
    stock: { type: Number, require: true },
    sale: { type: Number, default: 0 },
    rate: {
      score: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    collections: {
      type: [{ type: Schema.Types.ObjectId, ref: "Collection" }],
      default: [],
    },
    hasVariation: { type: Boolean, default: false },
    variantOptions: { type: [productVariantOptions], default: [] },
    variations: { type: [productVariations], default: [] },
    variantStats: {
      totalQuantity: { type: Number, default: 0 },
      totalCount: { type: Number, default: 0 },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 },
    },
    tags: { type: [String], default: [] },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isOnSale: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("ProductAlpha", productSchema);
