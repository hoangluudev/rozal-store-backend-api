const express = require("express");
const {
  verifyToken,
  checkIsAdmin,
} = require("../../middlewares/user.middleware");

const router = express.Router();

// // Get All Order
// router.get("/", [verifyToken, checkIsAdmin], getAllOrder);
// router.get(
//   "/search-order",
//   [verifyToken, checkIsAdmin],
//   getAllOrdersWithSearch
// );
// router.get(
//   "/filter-order",
//   [verifyToken, checkIsAdmin],
//   getAllOrdersWithFilter
// );
// // Get Order By ID
// router.put("/:orderId", [verifyToken, checkIsAdmin], updateOrderByID);
// router.delete(
//   "/delete-order/:orderId",
//   [verifyToken, checkIsAdmin],
//   deleteOrderByID
// );
// router.delete(
//   "/delete-multiple-order",
//   [verifyToken, checkIsAdmin],
//   deleteMultipleOrderByID
// );

module.exports = router;
