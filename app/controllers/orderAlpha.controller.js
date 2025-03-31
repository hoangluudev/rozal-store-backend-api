const randtoken = require("rand-token");
const moment = require("moment");
const cartItemModel = require("../models/cartItem.model");
const productModel = require("../models/productAlpha.model");
const ProductRatingModel = require("../models/ProductRating.model");
const orderModel = require("../models/order.model");
const userAddressesModel = require("../models/userAddress.model");
const { createError } = require("../services/createError.service");
const {
  checkRequiredFields,
  validateTableLimit,
  validateTablePage,
  validatePage,
  isFilterData,
} = require("../utils/HelperFunctions");
const {
  convertUTCtoDateGMT7,
  getTodayDateGMT7,
  convertUTCtoStringGMT7,
  convertGMT7TimestampToSeconds,
  convertUTCTimestampToSeconds,
} = require("../utils/TimeFunctions");
const { tryCatch } = require("../utils/tryCatch");
const {
  createZaloPaymentRequest,
  checkZaloPaymentStatus,
} = require("../services/createPayment.service");
const { convertISODateToLongDateFormat } = require("../utils/FormatFunction");
const {
  createOneTimeJob,
  cancelScheduledJob,
} = require("../services/schedule.service");

const shippingOptions = [
  {
    title: "Express Shipping",
    value: "express-shipping",
    costPrice: 70000,
    estimatedTime: {
      minDay: 1,
      maxDay: 3,
    },
    description:
      "Fast shipping ensures your items arrive in the shortest time possible.",
  },
  {
    title: "Standard Shipping",
    value: "standard-shipping",
    costPrice: 25000,
    estimatedTime: {
      minDay: 3,
      maxDay: 5,
    },
    description:
      "Standard shipping offers a balance of speed and cost for your convenience.",
  },
  {
    title: "Free Shipping",
    value: "free-shipping",
    costPrice: 0,
    estimatedTime: {
      minDay: 7,
      maxDay: 14,
    },
    description:
      "Enjoy free shipping on your order with standard delivery at no extra cost.",
  },
];

// User
const createOrder = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { selectedDeliveryAddressId, shippingOption, paymentMethod, note } =
    req.body;

  let requiredFields = [
    "selectedDeliveryAddressId",
    "shippingOption",
    "paymentMethod",
  ];

  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  const deliveryAddress = await userAddressesModel.findOne({
    _id: selectedDeliveryAddressId,
    userId: userId,
  });

  if (!deliveryAddress) {
    return createError(404, "Delivery address not found");
  }

  const existedShippingOption = shippingOptions.find(
    (option) => option.value === shippingOption
  );

  if (!existedShippingOption) {
    return createError(400, "Invalid shipping option");
  }

  const userCartItems = await cartItemModel
    .find({ userId, isSelected: true })
    .sort({ isSelected: -1, updatedAt: -1 });

  if (userCartItems.length === 0) {
    return createError(
      400,
      "Your cart is currently empty. Please add items to proceed."
    );
  } else {
    for (const item of userCartItems) {
      if (["Sold Out", "Unavailable"].includes(item.status)) {
        return createError(
          409,
          "There are invalid items in your cart. Please remove them to proceed with the checkout."
        );
      }
    }
  }

  let subTotalAmount = 0;
  userCartItems.forEach((item) => {
    subTotalAmount += item.price * item.quantity;
  });

  const shippingFee = existedShippingOption.costPrice;
  const totalAmount = subTotalAmount + shippingFee;

  const orderItems = userCartItems.map((cartItem) => ({
    productId: cartItem.productId,
    productCode: cartItem.productCode,
    name: cartItem.name,
    image: cartItem.image,
    quantity: cartItem.quantity,
    price: cartItem.price,
    comparePrice: cartItem.comparePrice,
    variants: cartItem.variants.map((variant) => ({
      name: variant.name,
      value: variant.value,
    })),
  }));

  const estimatedDelivery = convertUTCtoDateGMT7(
    new Date(
      Date.now() +
        existedShippingOption.estimatedTime.maxDay * 24 * 60 * 60 * 1000
    )
  );

  let randomToken = randtoken.generate(8).toUpperCase();
  let newOrderCode = `${moment().format("YYMMDD")}${randomToken}`;

  const todayDateGMT7 = getTodayDateGMT7();
  let newOrder = {
    orderCode: newOrderCode,
    userId: userId,
    items: orderItems,
    totalAmount: totalAmount,
    customerInfo: {
      addressId: selectedDeliveryAddressId,
      fullName: deliveryAddress.fullName,
      phone: deliveryAddress.phone,
      city: deliveryAddress.city,
      district: deliveryAddress.district,
      ward: deliveryAddress.ward,
      address: deliveryAddress.address,
      note: note || "",
    },
    shipping: {
      method: {
        name: existedShippingOption.title,
        cost: shippingFee,
      },
      progress: [
        {
          label: "Order Placed",
          description: "Order is placed",
          createdAt: todayDateGMT7,
        },
      ],
    },
    payment: {
      status: "Pending",
      amount: 0,
    },
    timestamps: {
      placedAt: todayDateGMT7,
      estimatedDeliveryDate: estimatedDelivery,
    },
  };

  switch (paymentMethod) {
    case "cash-on-delivery":
      newOrder.payment.method = "Cash On Delivery";
      newOrder.status = "Pending";
      newOrder.statusProgress = [
        {
          label: "Order Placed",
          status: "Completed",
          updatedAt: todayDateGMT7,
        },
        {
          label: "Payment Info Confirmed",
          status: "Active",
          updatedAt: "",
        },
        {
          label: "Order Shipped Out",
          status: "Inactive",
          updatedAt: "",
        },
        {
          label: "To Received",
          status: "Inactive",
          updatedAt: "",
        },
        {
          label: "To Rate",
          status: "Inactive",
          updatedAt: "",
        },
      ];
      break;
    case "zalopay":
      const transID = `${moment().format("YYMMDD")}_${Date.now()}`;
      const getPaymentExpirationDateGMT7 = new Date(
        Date.now() + 1 * 24 * 60 * 60 * 1000
      );
      newOrder.payment.method = "ZaloPay";
      newOrder.statusProgress = [
        {
          label: "Order Placed",
          status: "Completed",
          updatedAt: todayDateGMT7,
        },
        {
          label: "Order Paid",
          status: "Active",
          updatedAt: "",
        },
        {
          label: "Order Shipped Out",
          status: "Inactive",
          updatedAt: "",
        },
        {
          label: "To Received",
          status: "Inactive",
          updatedAt: "",
        },
        {
          label: "To Rate",
          status: "Inactive",
          updatedAt: "",
        },
      ];
      newOrder.status = "Unpaid";
      newOrder.payment.transId = transID;
      newOrder.timestamps.paymentExpiredAt = getPaymentExpirationDateGMT7;
      let newScheduledJob = {
        jobType: "cancel_order",
        scheduleTime: getPaymentExpirationDateGMT7,
        referenceId: newOrder.orderCode,
      };
      await createOneTimeJob(newScheduledJob);
      break;
    default:
      return createError(400, "This payment method is not yet supported");
  }

  const result = await orderModel.create(newOrder);
  let createdOrderCode = result.orderCode;
  let paymentResponse = null;
  if (result.payment.method === "ZaloPay") {
    paymentResponse = await createZaloPaymentRequest(createdOrderCode);
  }
  if (result) {
    await cartItemModel.deleteMany({ userId, isSelected: true });

    for (const item of userCartItems) {
      const product = await productModel.findById(item.productId);
      if (product.variantOptions.length > 0) {
        const matchedVariation = product.variations.find((v) =>
          v.variants.every(
            (variant, index) =>
              variant.name === item.variants[index]?.name &&
              variant.value === item.variants[index]?.value
          )
        );
        if (matchedVariation) {
          matchedVariation.quantity -= item.quantity;
        }
      } else {
        product.stock -= item.quantity;
      }
      await product.save();
    }
  }

  return res.status(201).json({
    message: "Order Created!",
    createdOrderCode,
    paymentUrl: paymentResponse ? paymentResponse.order_url : null,
  });
});
const getOrderStatusByOrderCode = tryCatch(async (req, res) => {
  const orderCode = req.params.orderCode;
  if (!orderCode) {
    return createError(400, "Order Code is required!");
  }

  const existedOrder = await orderModel.findOne({ orderCode });
  if (!existedOrder) {
    return createError(200, "Order not found!");
  }

  const orderStatus = {
    orderStatus: existedOrder.status,
    totalAmount: existedOrder.totalAmount,
    estimatedDeliveryDate: convertISODateToLongDateFormat(
      existedOrder.timestamps.estimatedDeliveryDate
    ),
  };
  switch (existedOrder.payment.method) {
    case "ZaloPay":
      orderStatus.isOnlinePayment = true;
      orderStatus.paymentStatus = existedOrder.payment.status;

      orderStatus.paymentExpiredAt = convertUTCtoStringGMT7(
        existedOrder.timestamps.paymentExpiredAt
      );

      if (existedOrder.payment.status !== "Success") {
        const zalopayResponse = await checkZaloPaymentStatus(
          existedOrder.payment.transId
        );
        const orderStatusReturnCode = zalopayResponse.return_code;
        const todayDateGMT7 = getTodayDateGMT7();

        switch (orderStatusReturnCode) {
          case 1:
            existedOrder.payment.status = "Success";
            existedOrder.payment.amount = zalopayResponse.amount;
            existedOrder.timestamps.paidAt = todayDateGMT7;
            existedOrder.status = "Pending";
            await cancelScheduledJob(existedOrder.orderCode);
            existedOrder.statusProgress = updateOrderStatusProgress(
              existedOrder.statusProgress,
              2,
              "Completed"
            );
            existedOrder.statusProgress = updateOrderStatusProgress(
              existedOrder.statusProgress,
              3,
              "Active"
            );
            break;
          case 2:
            existedOrder.payment.status = "Failed";
            break;
          case 3:
            existedOrder.payment.status = "Pending";
            break;
          default:
            break;
        }

        await existedOrder.save();
        orderStatus.paymentStatus = existedOrder.payment.status;
        orderStatus.paymentMethod = existedOrder.payment.method;
      }
      break;
    case "Momo":
      orderStatus.isOnlinePayment = true;
    default:
      orderStatus.isOnlinePayment = false;
      break;
  }

  return res.status(200).json({
    message: "Get order successfully",
    orderData: orderStatus,
  });
});
const getOrderByCode = tryCatch(async (req, res) => {
  const orderCode = req.params.orderCode;
  if (!orderCode) {
    return createError(400, "Order Code is required!");
  }

  const order = await orderModel.findOne({ orderCode }).select("-userId");
  if (!order) {
    return createError(200, "Order not found!");
  }
  const getProductItemWithRating = async (items) => {
    return await Promise.all(
      items.map(async (item) => {
        const product = await productModel.findById(item.productId);
        return { ...item.toObject(), rate: product?.rate };
      })
    );
  };
  let newOrderItems = await getProductItemWithRating(order.items);
  const paymentExpiredIn = order.timestamps.paymentExpiredAt
    ? convertUTCTimestampToSeconds(order.timestamps.paymentExpiredAt)
    : 0;

  return res.status(200).json({
    message: "Get order successfully",
    data: {
      ...order.toObject(),
      items: newOrderItems,
      timestamps: {
        ...order.timestamps,
        paymentExpiredIn,
      },
    },
  });
});
const getUserOrderHistory = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;

  let { status, search } = req.query;
  let page = parseInt(req.query.page, 10) || 1;
  const limit = 10;

  const statusMap = {
    all: [
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
    "to-pay": ["Unpaid"],
    "to-ship": ["Pending", "Confirmed", "In Preparation"],
    "to-receive": ["Shipped"],
    completed: ["Delivered", "Completed"],
    cancelled: ["Canceled"],
    "return-refund": ["Returned"],
  };

  let tabOptions = [
    { label: "All", value: "all" },
    { label: "To Pay", value: "to-pay" },
    { label: "To Ship", value: "to-ship" },
    { label: "To Receive", value: "to-receive" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Return/Refund", value: "return-refund" },
  ];

  if (!status || !statusMap[status]) {
    status = "all";
  }

  let filter = { userId };

  if (status !== "all") {
    filter.status = { $in: statusMap[status] };
  }

  if (status === "all" && search) {
    filter.$or = [
      { orderCode: { $regex: search, $options: "i" } },
      { "items.name": { $regex: search, $options: "i" } },
    ];
  }

  const totalItemCount = await orderModel.countDocuments(filter);
  const totalPage = Math.ceil(totalItemCount / limit);

  page = validatePage(page, totalPage);
  const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

  const result = await orderModel
    .find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const getProductItemWithRating = async (items) => {
    return await Promise.all(
      items.map(async (item) => {
        const product = await productModel.findById(item.productId);
        const existedMyProductRating = await ProductRatingModel.findOne({
          productId: item.productId,
        }).select("-previousOrders -userId");
        let newUser = {
          username: user.username,
          profileImage: user.profileImage,
        };
        return {
          ...item.toObject(),
          rate: product?.rate,
          myRating: existedMyProductRating ? existedMyProductRating : null,
          user: newUser,
        };
      })
    );
  };

  let formattedOrders = [];
  if (result.length > 0) {
    formattedOrders = await Promise.all(
      result.map(async (order) => ({
        orderCode: order.orderCode,
        items: await getProductItemWithRating(order.items),
        totalAmount: order.totalAmount,
        paymentMethod: order.payment.method,
        isPaid: order.payment.status === "Success",
        status: order.status,
        lastShippingProgress: order.shipping.progress.slice(-1)[0] || {},
        customerAddressId: order?.customerInfo?.addressId?.toString() || "",
        timestamps: {
          createdDate: order.timestamps.placedAt,
          estimatedDeliveryDate: order.timestamps.estimatedDeliveryDate,
          paymentExpiredIn: order.timestamps.paymentExpiredAt
            ? convertUTCTimestampToSeconds(order.timestamps.paymentExpiredAt)
            : 0,
          completedAt: order.timestamps.completedAt,
        },
      }))
    );
  }

  const tabCount = {};
  for (const [key, statuses] of Object.entries(statusMap)) {
    const count = await orderModel.countDocuments({
      userId,
      status: { $in: statuses },
    });
    tabCount[key] = count;
  }

  return res.status(200).json({
    message: "Get user orders successfully",
    data: formattedOrders,
    paginationInfo: {
      page,
      totalItemCount,
      totalPage,
      isFilterOn: status !== "all",
      isSearchOn: isFilterData(search),
      filterValue: { status, search },
      tabOptions,
      tabCount,
    },
  });
});
const cancelOrderByOrderCode = tryCatch(async (req, res) => {
  const orderCode = req.params.orderCode;
  const { cancelReason, canceledBy } = req.body;

  let requiredFields = ["cancelReason"];
  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  const order = await orderModel.findOne({ orderCode });

  if (!order) {
    return createError(404, "Order not found!");
  }

  if (order.status === "Canceled") {
    return createError(409, "This order is already canceled!");
  }

  if (
    ["Shipped", "Delivered", "Completed", "Returned"].includes(order.status)
  ) {
    return createError(409, "Cannot cancel order in this state!");
  }
  if (order.cancellationDetails.approvalStatus === "Pending") {
    return createError(
      409,
      "The status of your order cancellation request is under review. Please be patient."
    );
  }
  if (
    ["Approved", "Declined"].includes(order.cancellationDetails.approvalStatus)
  ) {
    return createError(
      409,
      "Your order cancellation request has already been processed. No further actions are needed at this time."
    );
  }

  let dateToday = getTodayDateGMT7();
  order.cancellationDetails = {
    reason: cancelReason || "No reason provided",
    initiatedBy: canceledBy || "User",
    approvalStatus: "Pending",
  };
  order.timestamps.cancellationRequestedAt = dateToday;
  await order.save();

  return res.status(200).json({
    message: "Order has been canceled successfully!",
    order,
  });
});
const changePaymentMethod = tryCatch(async (req, res) => {
  const orderCode = req.params.orderCode;
  const { newPaymentMethod } = req.body;

  if (!orderCode) {
    return createError(400, "Order Code is required!");
  }

  const requiredFields = ["newPaymentMethod"];
  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  const order = await orderModel.findOne({ orderCode });
  if (!order) {
    return createError(404, "Order not found");
  }
  if (order.payment.method === "Cash On Delivery") {
    return createError(
      409,
      "Cannot change payment method for COD(Cash on Delivery) order!"
    );
  }
  if (order.payment.status === "Success") {
    return createError(400, "Order has already been paid!");
  }
  if (!["Unpaid"].includes(order.status)) {
    return createError(400, "Cannot change payment method in this state!");
  }
  const currentPaymentMethod = order.payment.method.toLowerCase();
  if (currentPaymentMethod === newPaymentMethod) {
    return createError(409, "You are already using this payment method!");
  }

  let updatedPaymentMethod;
  switch (newPaymentMethod) {
    case "zalopay":
      updatedPaymentMethod = "ZaloPay";
      break;
    case "momo":
      updatedPaymentMethod = "Momo";
      return createError(409, "This method not support yet");
    case "cash-on-delivery":
      return createError(409, "Cannot change payment to COD");
    default:
      return createError(400, "Invalid payment method");
  }

  order.payment.method = updatedPaymentMethod;
  order.status = "Unpaid";
  await order.save();

  return res.status(200).json({
    message: "Payment method updated",
  });
});
const changeDeliveryAddress = tryCatch(async (req, res) => {
  const orderCode = req.params.orderCode;
  const { newAddressId } = req.body;

  if (!orderCode) {
    return createError(400, "Order Code is required!");
  }

  let requiredFields = ["newAddressId"];
  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  const order = await orderModel.findOne({ orderCode });
  if (!order) {
    return createError(404, "Order not found");
  }

  if (
    ["Shipped", "Delivered", "Completed", "Canceled"].includes(order.status)
  ) {
    return createError(400, "Cannot change delivery address in this state!");
  }

  const newAddress = await userAddressesModel.findOne({
    _id: newAddressId,
    userId: order.userId,
  });

  if (!newAddress) {
    return createError(404, "Delivery address not found!");
  }

  const isSameAddress = (current, updated) => {
    return (
      current.addressId?.toString() === updated._id?.toString() &&
      current.fullName === updated.fullName &&
      current.phone === updated.phone &&
      current.city === updated.city &&
      current.district === updated.district &&
      current.ward === updated.ward &&
      current.address === updated.address
    );
  };

  if (isSameAddress(order.customerInfo, newAddress)) {
    return createError(200, "No changes detected.");
  }

  order.customerInfo = {
    addressId: newAddress._id,
    fullName: newAddress.fullName,
    phone: newAddress.phone,
    city: newAddress.city,
    district: newAddress.district,
    ward: newAddress.ward,
    address: newAddress.address,
  };

  await order.save();

  return res.status(200).json({
    message: "Delivery address updated",
  });
});
const repurchaseOrder = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { orderCode } = req.params;

  if (!orderCode) {
    return createError(400, "Order code is required!");
  }

  const order = await orderModel.findOne({ orderCode, userId });

  if (!order) {
    return createError(404, "Order not found!");
  }
  if (order.items.length === 0) {
    return createError(400, "Order is empty!");
  }

  const updatedCartItems = [];
  let errorCount = 0;

  for (const orderItem of order.items) {
    const { productId, variants } = orderItem;
    const quantity = 1;
    const product = await productModel.findById(productId);

    if (
      !product ||
      !product.isPublished ||
      ["Sold Out", "Discontinued", "Coming Soon"].includes(product.status)
    ) {
      errorCount++;
      continue;
    }

    let newCartItem = {
      userId,
      productId: product._id,
      productCode: product.productCode,
      name: product.name,
    };

    if (product.variantOptions.length > 0) {
      const matchedVariation = product.variations.find((v) =>
        v.variants.every(
          (variant, index) =>
            variant.name === variants[index]?.name &&
            variant.value === variants[index]?.value
        )
      );

      if (!matchedVariation || matchedVariation.quantity === 0) {
        errorCount++;
        continue;
      }

      newCartItem = {
        ...newCartItem,
        image:
          matchedVariation.image !== ""
            ? matchedVariation.image
            : product.avatarImage,
        price: matchedVariation.price,
        comparePrice: matchedVariation.comparePrice,
        quantity: Math.min(quantity, matchedVariation.quantity),
        stock: matchedVariation.quantity,
        variants: variants,
      };
    } else {
      if (product.stock === 0) {
        errorCount++;
        continue;
      }

      newCartItem = {
        ...newCartItem,
        image: product.avatarImage,
        price: product.prices.price,
        comparePrice: product.prices.comparePrice,
        quantity: Math.min(quantity, product.stock),
        stock: product.stock,
      };
    }

    const existedCartItem = await cartItemModel.findOne({
      userId,
      productId: product._id,
      variants: variants || [],
    });

    if (existedCartItem) {
      existedCartItem.quantity = Math.min(
        existedCartItem.quantity + newCartItem.quantity,
        newCartItem.stock
      );
      await existedCartItem.save();
      updatedCartItems.push(existedCartItem);
    } else {
      const result = await cartItemModel.create(newCartItem);
      updatedCartItems.push(result);
    }
  }

  const successCount = updatedCartItems.length;

  if (successCount > 0 && errorCount > 0) {
    return res.status(200).json({
      message: `Added ${successCount} item(s) to cart. ${errorCount} item(s) are invalid.`,
      data: updatedCartItems,
    });
  } else if (successCount > 0) {
    return res.status(200).json({
      message: `Added ${successCount} item(s) to cart successfully!`,
      data: updatedCartItems,
    });
  } else {
    return createError(400, "All items in this order are invalid.");
  }
});

// Checkout Info
const getCheckoutInfo = tryCatch(async (req, res) => {
  let { selectedShippingOption } = req.query;

  let defaultShippingOption = "standard-shipping";
  let shippingOption = shippingOptions.find(
    (option) => option.value === selectedShippingOption
  );

  if (!shippingOption) {
    shippingOption = shippingOptions.find(
      (option) => option.value === defaultShippingOption
    );
    selectedShippingOption = defaultShippingOption;
  }

  const shippingFee = shippingOption ? shippingOption.costPrice : 0;

  const user = req.user;
  const userId = user._id;
  const selectedCartItem = await cartItemModel.find({
    userId,
    isSelected: true,
  });

  let orderBillings = {
    subTotalAmount: 0,
    totalSavedAmount: 0,
    totalAmount: 0,
    shippingFee,
  };

  selectedCartItem.forEach((item) => {
    const itemSubtotal = item.price * item.quantity;
    orderBillings.subTotalAmount += itemSubtotal;
  });
  orderBillings.totalAmount = orderBillings.subTotalAmount + shippingFee;

  const response = {
    message: "Get checkout info success.",
    selectedCartItem,
    selectedShippingOption,
    orderBillings,
    shippingOptions,
  };

  return res.status(200).json(response);
});

module.exports = {
  createOrder,
  getUserOrderHistory,
  getOrderByCode,
  getOrderStatusByOrderCode,
  getCheckoutInfo,
  cancelOrderByOrderCode,
  changePaymentMethod,
  changeDeliveryAddress,
  repurchaseOrder,
};
