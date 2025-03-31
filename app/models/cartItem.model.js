const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productCode: { type: String, require: true },
    isSelected: { type: Boolean, default: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    comparePrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    stock: { type: Number, required: true },
    variants: [
      {
        name: { type: String, require: true },
        value: { type: String, require: true },
      },
    ],
    status: {
      type: String,
      default: "Available",
      enum: ["Available", "Sold Out", "Unavailable"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CartItem", cartItemSchema);
