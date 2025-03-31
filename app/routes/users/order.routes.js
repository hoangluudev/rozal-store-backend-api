const express = require("express");
const {
  createOrder,
  getUserOrderHistory,
  getOrderByCode,
  getOrderStatusByOrderCode,
  getCheckoutInfo,
  cancelOrderByOrderCode,
  changePaymentMethod,
  changeDeliveryAddress,
  repurchaseOrder,
} = require("../../controllers/orderAlpha.controller");

const router = express.Router();

router.get("/history", getUserOrderHistory);
router.get("/id/:orderCode", getOrderByCode);
router.post("/", createOrder);
router.get("/order-status/:orderCode", getOrderStatusByOrderCode);
router.get("/checkout-info", getCheckoutInfo);
router.post("/cancel-order/:orderCode", cancelOrderByOrderCode);
router.patch("/change-payment/:orderCode", changePaymentMethod);
router.patch("/change-address/:orderCode", changeDeliveryAddress);
router.post("/repurchase/:orderCode", repurchaseOrder);

module.exports = router;
