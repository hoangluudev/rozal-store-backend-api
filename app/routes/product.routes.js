const express = require("express");

const route = express.Router();

const {
  getProductsWithFilter,
  getProductByID,
  getRelatedProductByID,
  getAllProductByFeatures,
  getAllProductByLatest,
} = require("../controllers/product.controller");

route.get("/", getProductsWithFilter);
route.get("/featured-product", getAllProductByFeatures);
route.get("/latest-product", getAllProductByLatest);

route.get("/:productId", getProductByID);
route.get("/related-products/:productId", getRelatedProductByID);

module.exports = route;
