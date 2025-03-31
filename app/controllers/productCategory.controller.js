const { updateImageUsageStatus } = require("../services/uploadImage.service");
const {
  validateTableLimit,
  convertArrayToOptions,
  isValidObjectId,
  validateTablePage,
  isNotNull,
  isArray,
  isFilterData,
  checkEmptyFields,
} = require("../utils/HelperFunctions");
const { stringToSlug } = require("../utils/FormatFunction");
const { createError } = require("../services/createError.service");
const imageModel = require("../models/image.model");
const productAlphaModel = require("../models/productAlpha.model");
const ProductCategoryModel = require("../models/ProductCategory.model");
const ProductTypeModel = require("../models/ProductType.model");

const getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;
    let page = parseInt(req.query.page, 10) || 0;
    let limit = validateTableLimit(parseInt(req.query.limit, 10)) || 10;
    const searchTextLower = search ? search.toLowerCase() : "";

    let filter = {};
    if (searchTextLower) {
      filter.name = new RegExp(searchTextLower, "i");
    }

    const totalItemCount = await ProductCategoryModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItemCount / limit);

    page = validateTablePage(page, totalPages);
    const skip = parseInt(page, 10) * parseInt(limit, 10);

    const result = await ProductCategoryModel.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const products = await productAlphaModel.find();

    const productCounts = {};
    for (let product of products) {
      const categoryId = product.category.toString();
      if (productCounts[categoryId]) {
        productCounts[categoryId]++;
      } else {
        productCounts[categoryId] = 1;
      }
    }

    for (let category of result) {
      const categoryId = category._id.toString();
      category.productCount = productCounts[categoryId] || 0;

      await ProductCategoryModel.updateOne(
        { _id: categoryId },
        { productCount: category.productCount }
      );
    }

    const response = {
      status: "Get all categories successfully.",
      data: result,
      totalItemCount,
      page,
      limit,
      isSearchOn: isFilterData(searchTextLower),
      filterValue: req.query,
    };
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const getClientCategories = async (req, res) => {
  try {
    const categories = await ProductCategoryModel.find({
      name: { $ne: "Uncategorized" },
    });
    return res.status(200).json({
      message: "Get filter categories success.",
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const getAllCategoryOptions = async (req, res) => {
  try {
    const categories = await ProductCategoryModel.find({
      isPublished: { $ne: false },
    });
    const categoryOptions = convertArrayToOptions("name", "_id", categories);

    return res.status(200).json({
      message: "Get category options success.",
      data: categoryOptions,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const getCategoryByID = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    if (!isValidObjectId(categoryId)) {
      return createError(400, "Category ID is invalid!");
    }

    const result = await ProductCategoryModel.findById(categoryId);

    return res.status(200).json({
      status: "Get Category Successfully!",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, avatarImage, description, isPublished } = req.body;

    if (!name) {
      return createError(400, "name is missing!");
    }
    const existedCategory = await ProductCategoryModel.findOne({ name });
    if (existedCategory) {
      return createError(409, "This category is already existed!");
    }
    let slug = stringToSlug(name);

    if (avatarImage) {
      await updateImageUsageStatus(avatarImage, true);
    }

    const newCategory = {
      name: name,
      slug: slug,
      avatarImage: avatarImage || "",
      description: description || "",
      isPublished: isPublished || false,
    };
    const result = await ProductCategoryModel.create(newCategory);

    return res.status(201).json({
      message: "New Category Added!",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const updateCategoryByID = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    if (!isValidObjectId(categoryId)) {
      return createError(400, "Category ID is not valid!");
    }
    let category = await ProductCategoryModel.findById(categoryId);

    const { name, avatarImage, description, isPublished } = req.body;

    const requiredFields = ["name"];
    const emptyFields = checkEmptyFields(req.body, requiredFields);
    if (emptyFields) {
      return createError(400, emptyFields);
    }
    if (!category) {
      return createError(400, "Category not found");
    }
    if (name) {
      category.name = name;
      category.slug = stringToSlug(name);
    }
    if (description) {
      category.description = description;
    }
    if (isNotNull(avatarImage)) {
      if (category.avatarImage !== "") {
        let existedImage = await imageModel.findOne({
          imageUrl: category.avatarImage,
        });
        if (existedImage) {
          await updateImageUsageStatus(category.avatarImage, false);
        }
      }
      if (avatarImage !== "") {
        await updateImageUsageStatus(avatarImage, true);
      }
      category.avatarImage = avatarImage;
    }
    if (isNotNull(isPublished)) {
      category.isPublished = isPublished;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      message: "Category Updated!",
      data: updatedCategory,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteCategoryByID = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    if (!isValidObjectId(categoryId)) {
      return createError(400, "Category ID is not valid!");
    }

    const category = await ProductCategoryModel.findById(categoryId);
    if (!category) {
      return createError(400, "Category does not exist.");
    }

    if (category.productCount > 0) {
      return createError(
        400,
        "Unable to delete category as it contains products."
      );
    }

    const subcategory = await ProductTypeModel.find({
      categoryId: categoryId,
    });
    if (subcategory.length > 0) {
      return createError(
        400,
        "Unable to delete as the category has child categories."
      );
    }

    if (category.avatarImage !== "") {
      let existedImage = await imageModel.findOne({
        imageUrl: category.avatarImage,
      });
      if (existedImage) {
        await updateImageUsageStatus(category.avatarImage, false);
      }
    }

    await ProductCategoryModel.findByIdAndDelete(categoryId);

    return res.status(200).json({
      message: "Category deleted!",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteMultipleCategories = async (req, res) => {
  try {
    const { categoryIDs } = req.body;

    if (!isArray(categoryIDs) || categoryIDs.length === 0) {
      return createError(400, "Category IDs are not valid!");
    }

    const invalidIds = categoryIDs.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return createError(400, `Invalid Category IDs: ${invalidIds.join(", ")}`);
    }

    const deletionResults = await Promise.all(
      categoryIDs.map(async (categoryId) => {
        let category = await ProductCategoryModel.findById(categoryId);

        if (!category) {
          return {
            categoryId,
            status: "Not Found",
            message: "This category does not exist.",
          };
        }

        if (category.productCount > 0) {
          return {
            categoryId,
            status: "Bad Request",
            message: "Unable to delete category as it contains products.",
          };
        }

        const productTypes = await ProductTypeModel.find({
          categoryId: categoryId,
        });
        if (productTypes.length > 0) {
          return {
            categoryId,
            status: "Bad Request",
            message:
              "Unable to delete as the category has associated product types.",
          };
        }

        if (category.avatarImage !== "") {
          let existedImage = await imageModel.findOne({
            imageUrl: category.avatarImage,
          });
          if (existedImage) {
            await updateImageUsageStatus(category.avatarImage, false);
          }
        }

        await ProductCategoryModel.findByIdAndDelete(categoryId);
        return {
          categoryId,
          status: "Success",
          message: "Deleted successfully.",
        };
      })
    );
    const successfulDeletions = deletionResults.filter(
      (result) => result.status === "Success"
    ).length;

    return res.status(200).json({
      message: `${successfulDeletions} categories deleted successfully.`,
      results: deletionResults,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

module.exports = {
  getAllCategories,
  getAllCategoryOptions,
  getCategoryByID,
  createCategory,
  updateCategoryByID,
  deleteCategoryByID,
  deleteMultipleCategories,
};
