const express = require("express");
const productRoutes = require("./users/product.routes");
const orderRoutes = require("./users/order.routes");
const cartItemRoutes = require("./users/CartItem.routes");
const userAddressRoutes = require("./users/UserAddress.routes");
const paymentRoutes = require("./users/payment.routes");
const ProductRatingRoutes = require("./users/ProductRatings.routes");
const { verifyToken } = require("../middlewares/user.middleware");
const router = express.Router();

router.use("/products-alpha", productRoutes);
router.use("/rating/product", [verifyToken], ProductRatingRoutes);
router.use("/shopping-cart", [verifyToken], cartItemRoutes);
router.use("/user/address", [verifyToken], userAddressRoutes);
router.use("/orders-alpha", [verifyToken], orderRoutes);
router.use("/payment", paymentRoutes);

module.exports = router;    
