const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    orderCode: { type: String, unique: true, require: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", require: true },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          require: true,
        },
        productCode: { type: String, require: true },
        name: { type: String, require: true },
        image: { type: String, require: true },
        quantity: { type: Number, require: true },
        price: { type: Number, require: true },
        comparePrice: { type: Number, require: true },
        variants: [
          {
            name: { type: String, require: true },
            value: { type: String, require: true },
          },
        ],
      },
    ],
    totalAmount: { type: Number, require: true },
    customerInfo: {
      addressId: {
        type: Schema.Types.ObjectId,
        ref: "UserAddress",
        require: true,
      },
      fullName: { type: String, require: true },
      phone: { type: String, require: true },
      city: { type: String, require: true },
      district: { type: String, require: true },
      ward: { type: String, require: true },
      address: { type: String, require: true },
      note: { type: String, default: "" },
    },
    shipping: {
      method: {
        name: { type: String, require: true },
        cost: { type: Number, require: true },
      },
      progress: [
        {
          label: { type: String, default: "" },
          description: { type: String, default: "" },
          createdAt: { type: String, default: "" },
        },
      ],
    },
    payment: {
      method: {
        type: String,
        required: true,
        enum: ["Cash On Delivery", "ZaloPay", "Momo"],
      },
      status: {
        type: String,
        enum: ["Pending", "Success", "Failed"],
        default: "Pending",
      },
      url: { type: String, default: "" },
      transId: { type: String, default: "" },
      amount: { type: Number, default: 0 },
    },
    cancellationDetails: {
      cancellationId: { type: String, default: "" },
      reason: { type: String, default: "" },
      initiatedBy: {
        type: String,
        enum: ["User", "Seller", "System", ""],
        default: "",
      },
      approvalStatus: {
        type: String,
        enum: ["None", "Pending", "Approved", "Declined"],
        default: "None",
      },
    },
    isTrackOrder: { type: Boolean, default: false },
    timestamps: {
      paymentExpiredAt: { type: Date, default: null },
      paymentRequestExpiredAt: { type: String, default: "" },
      cancellationRequestedAt: { type: String, default: "" },
      cancellationCompletedAt: { type: String, default: "" },
      estimatedDeliveryDate: { type: String, default: "" },
      ratingDeadlineAt: { type: Date, default: null },
      placedAt: { type: String, default: "" },
      paidAt: { type: String, default: "" },
      shippedAt: { type: String, default: "" },
      deliveredAt: { type: Date, default: null },
      completedAt: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: [
        "Unpaid",
        "Pending",
        "Confirmed",
        "In Preparation",
        "Shipped",
        "Delivered",
        "Completed",
        "Canceled",
        "Returned",
      ],
      default: "Pending",
    },
    statusProgress: [
      {
        label: {
          type: String,
          default: "",
        },
        status: {
          type: String,
          enum: ["Inactive", "Active", "Completed"],
          default: "Active",
        },
        updatedAt: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Order", orderSchema);
