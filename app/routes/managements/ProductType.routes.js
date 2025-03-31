const express = require("express");
const route = express.Router();

const {
  getAllProductTypes,
  getProductTypeByID,
  createProductType,
  updateProductTypeByID,
  deleteProductTypeByID,
  deleteMultipleProductTypes,
} = require("../../controllers/ProductType.controller");

route.get("/", getAllProductTypes);
route.get("/id/:productTypeId", getProductTypeByID);
route.post("/", createProductType);
route.put("/:productTypeId", updateProductTypeByID);
route.delete("/delete/:productTypeId", deleteProductTypeByID);
route.delete("/delete-multiple", deleteMultipleProductTypes);

module.exports = route;
