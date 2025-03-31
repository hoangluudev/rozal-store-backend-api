const express = require("express");
const {
  getAllProductsForUser,
  getProductFilterOptionsForUser,
  getProductByCodeForUser,
  getRelatedProductsByCode,
} = require("../../controllers/productAlpha.controller");

const router = express.Router();

router.get("/", getAllProductsForUser);
router.get("/filter-options", getProductFilterOptionsForUser);
router.get("/id/:productCode", getProductByCodeForUser);
router.get("/related-products/:productCode", getRelatedProductsByCode);

module.exports = router;
