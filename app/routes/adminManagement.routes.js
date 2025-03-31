const express = require("express");
const { verifyToken, checkIsAdmin } = require("../middlewares/user.middleware");
const productRoutes = require("./managements/product.routes");
const productAlphaRoutes = require("./managements/productAlpha.routes");
const orderRoutes = require("./managements/order.routes");
const categoryRoutes = require("./managements/category.routes");
const ProductTypeRoutes = require("./managements/ProductType.routes");
const ScheduleJobRoutes = require("./managements/scheduleJob.routes");

const route = express.Router();

route.use("/product", productRoutes);
route.use("/products", productAlphaRoutes);
route.use("/orders", orderRoutes);
route.use("/categories", categoryRoutes);
route.use("/product-types", ProductTypeRoutes);
route.use("/schedule-jobs", [verifyToken, checkIsAdmin], ScheduleJobRoutes);

module.exports = route;
