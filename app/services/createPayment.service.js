const axios = require("axios");
const moment = require("moment");
const CryptoJS = require("crypto-js");
const qs = require("qs");
const zalopayConfig = require("../config/zalopayConfig");
const orderModel = require("../models/order.model");
const { createError } = require("./createError.service");
const {
  convertUTCtoStringGMT7,
  compareTimestamps,
} = require("../utils/TimeFunctions");

const createZaloPaymentRequest = async (orderCode) => {
  try {
    const order = await orderModel.findOne({ orderCode });

    let generateNewTransID = false;
    if (order.timestamps.paymentRequestExpiredAt) {
      const currentTime = convertUTCtoStringGMT7(new Date());
      const paymentRequestExpirationDate =
        order.timestamps.paymentRequestExpiredAt;
      const isExpired = compareTimestamps(
        currentTime,
        paymentRequestExpirationDate
      );

      if (!isExpired) {
        return { order_url: order.payment.url };
      } else {
        generateNewTransID = true;
      }
    }

    const totalAmount = order.totalAmount;
    const appUser = order.customerInfo.fullName;
    const appTime = Date.now();
    let transID = order.payment.transId;

    if (generateNewTransID) {
      transID = `${moment().format("YYMMDD")}_${appTime}`;
      order.payment.transId = transID;
    }

    const embed_data = {
      redirecturl: `http://localhost:3000/order/order-success/${order.orderCode}`,
    };

    const items = [{}];
    const data = `${
      zalopayConfig.app_id
    }|${transID}|${appUser}|${totalAmount}|${appTime}|${JSON.stringify(
      embed_data
    )}|${JSON.stringify(items)}`;
    const mac = CryptoJS.HmacSHA256(data, zalopayConfig.key1).toString();

    const params = {
      app_id: zalopayConfig.app_id,
      app_user: appUser,
      app_time: appTime,
      amount: totalAmount,
      app_trans_id: transID,
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      description: `Payment for the order #${order.orderCode}`,
      mac: mac,
      bank_code: "",
      callback_url: `${process.env.SERVER_TEST_URL}/shop24h/payment/zalopay/callback`,
    };

    const response = await axios.post(zalopayConfig.endpoint, null, {
      params: params,
    });

    const paymentExpiredInMinutes = 15;
    const getRequestExpirationDate = convertUTCtoStringGMT7(
      new Date(Date.now() + paymentExpiredInMinutes * 60 * 1000)
    );
    order.timestamps.paymentRequestExpiredAt = getRequestExpirationDate;
    order.payment.url = response.data.order_url;
    await order.save();

    return response.data;
  } catch (error) {
    return createError(500, error);
  }
};
const checkZaloPaymentStatus = async (transId) => {
  try {
    const postData = {
      app_id: zalopayConfig.app_id,
      app_trans_id: transId,
    };

    const data = `${postData.app_id}|${postData.app_trans_id}|${zalopayConfig.key1}`;
    postData.mac = CryptoJS.HmacSHA256(data, zalopayConfig.key1).toString();

    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/query",
      qs.stringify(postData),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error) {
    return createError(500, error);
  }
};

module.exports = { createZaloPaymentRequest, checkZaloPaymentStatus };
