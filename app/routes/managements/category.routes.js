const express = require("express");
const route = express.Router();
const {
  getAllCategories,
  getAllCategoryOptions,
  getCategoryByID,
  createCategory,
  updateCategoryByID,
  deleteCategoryByID,
  deleteMultipleCategories,
} = require("../../controllers/ProductCategory.controller");

route.get("/", getAllCategories);
route.get("/id/:categoryId", getCategoryByID);
route.get("/category-options", getAllCategoryOptions);
route.post("/", createCategory);
route.put("/:categoryId", updateCategoryByID);
route.delete("/delete/:categoryId", deleteCategoryByID);
route.delete("/delete-multiple", deleteMultipleCategories);

module.exports = route;
