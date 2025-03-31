const express = require("express");
const route = express.Router();

const {
  createOrder,
  getOrderByID,
  cancelOrderByID,
} = require("../controllers/order.controller");

route.post("/", createOrder);
route.get("/:orderId", getOrderByID);
route.patch("/cancel-order/:orderId", cancelOrderByID);

module.exports = route;
