const express = require("express");
const {
  getAllProductsForUser,
  getProductFilterOptionsForUser,
  getProductByCodeForUser,
  getRelatedProductsByCode,
  getProductsByFeatureForUser,
  getProductsByLatestForUser,
} = require("../../controllers/productAlpha.controller");

const router = express.Router();

router.get("/", getAllProductsForUser);
router.get("/filter-options", getProductFilterOptionsForUser);
router.get("/id/:productCode", getProductByCodeForUser);
router.get("/related-products/:productCode", getRelatedProductsByCode);
router.get("/featured-products", getProductsByFeatureForUser);
router.get("/latest-products", getProductsByLatestForUser);

module.exports = router;
