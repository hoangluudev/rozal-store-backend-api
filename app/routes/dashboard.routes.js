const express = require("express");
const route = express.Router();

const { verifyToken, checkIsAdmin } = require("../middlewares/user.middleware");
const {
  getDashboardStatistics,
} = require("../controllers/dashboard.controller");

route.get("/", [verifyToken, checkIsAdmin], getDashboardStatistics);

module.exports = route;
