const express = require("express");
const {
  verifyToken,
  checkIsAdmin,
} = require("../../middlewares/user.middleware");
const {
  getAllProduct,
  getAllProductsWithSearch,
  getAllProductsWithFilter,
  getProductByID,
  createProduct,
  updateProductByID,
  deleteProductByID,
  deleteMultipleProductByID,
} = require("../../controllers/product.controller");

const router = express.Router();

// Get All Product
router.get("/", [verifyToken, checkIsAdmin], getAllProduct);
router.get(
  "/search-product",
  [verifyToken, checkIsAdmin],
  getAllProductsWithSearch
);
router.get(
  "/filter-product",
  [verifyToken, checkIsAdmin],
  getAllProductsWithFilter
);

// Get Product By ID
router.get("/:productId", [verifyToken, checkIsAdmin], getProductByID);

// Create Product
router.post("/", [verifyToken, checkIsAdmin], createProduct);

// Update Product
router.put("/:productId", [verifyToken, checkIsAdmin], updateProductByID);

// Delete Product
router.delete(
  "/delete-product/:productId",
  [verifyToken, checkIsAdmin],
  deleteProductByID
);
router.delete(
  "/delete-multiple-product",
  [verifyToken, checkIsAdmin],
  deleteMultipleProductByID
);

module.exports = router;
