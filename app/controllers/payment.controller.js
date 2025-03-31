const CryptoJS = require("crypto-js");
const orderModel = require("../models/order.model");
const zalopayConfig = require("../config/zalopayConfig");
const { tryCatch } = require("../utils/tryCatch");
const {
  createZaloPaymentRequest,
} = require("../services/createPayment.service");
const { createError } = require("../services/createError.service");
const { getTodayDateGMT7 } = require("../utils/TimeFunctions");

const createRetryPaymentRequest = tryCatch(async (req, res) => {
  const { orderCode } = req.params;

  if (!orderCode) {
    return createError(400, "Order code is required!");
  }

  const order = await orderModel.findOne({ orderCode });
  if (!order) {
    return createError(404, "Order not found!");
  }

  if (
    [
      "Pending",
      "Confirmed",
      "In Preparation",
      "Shipped",
      "Delivered",
      "Completed",
      "Canceled",
      "Returned",
    ].includes(order.status)
  ) {
    return createError(409, "Cannot retry payment for this order status.");
  }

  if (order.payment.status === "Success") {
    return createError(409, "Order has already been paid.");
  }

  let paymentResponse = null;

  if (order.payment.method === "Cash On Delivery") {
    return createError(409, "Payment retry is not supported for COD.");
  } else if (order.payment.method === "ZaloPay") {
    paymentResponse = await createZaloPaymentRequest(orderCode);
  } else {
    return createError(409, "Unsupported payment method for retry.");
  }

  return res.status(200).json({
    message: "Payment retry request created successfully.",
    paymentUrl: paymentResponse.order_url || null,
  });
});
const createZaloCallbackRequest = async (req, res) => {
  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, zalopayConfig.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      let dataJson = JSON.parse(dataStr);
      let appTransId = dataJson["app_trans_id"];

      const existedOrder = await orderModel.findOne({
        "payment.transId": appTransId,
      });
      if (!existedOrder) {
        result.return_code = -1;
        result.return_message = "Order not found!";
      } else {
        const todayDateGMT7 = getTodayDateGMT7();
        existedOrder.payment.status = "Success";
        existedOrder.payment.amount = dataJson["amount"];
        existedOrder.timestamps.paidAt = todayDateGMT7;
        existedOrder.status = "Pending";
        await existedOrder.save();

        result.return_code = 1;
        result.return_message = "success";
      }
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  res.json(result);
};

module.exports = {
  createRetryPaymentRequest,
  createZaloCallbackRequest,
};
