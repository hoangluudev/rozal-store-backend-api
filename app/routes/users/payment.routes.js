const express = require("express");
const {
  createRetryPaymentRequest,
  createZaloCallbackRequest,
} = require("../../controllers/payment.controller");
const { verifyToken } = require("../../middlewares/user.middleware");
const router = express.Router();

router.post(
  "/zalopay/retry-payment/:orderCode",
  [verifyToken],
  createRetryPaymentRequest
);
router.post("/zalopay/callback", createZaloCallbackRequest);

module.exports = router;
