const express = require("express");
const {
  createProductRating,
  updateProductRating,
} = require("../../controllers/productRating.controller");

const router = express.Router();

router.post("/:productCode", createProductRating);
router.put("/:productCode", updateProductRating);

module.exports = router;
