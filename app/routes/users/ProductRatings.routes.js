const express = require("express");
const {
  createProductRating,
  updateProductRating,
} = require("../../controllers/ProductRating.controller");

const router = express.Router();

router.post("/:productCode", createProductRating);
router.put("/:productCode", updateProductRating);

module.exports = router;
