const express = require("express");
const {
  getAllProducts,
  getProductByID,
  createProduct,
  updateProductByID,
  deleteProductByID,
  deleteMultipleProducts,
  getProductSelectOptions,
} = require("../../controllers/productAlpha.controller");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/id/:productId", getProductByID);
router.get("/options", getProductSelectOptions);
router.post("/", createProduct);
router.put("/:id", updateProductByID);
router.delete("/delete/:id", deleteProductByID);
router.delete("/delete-multiple", deleteMultipleProducts);

module.exports = router;
