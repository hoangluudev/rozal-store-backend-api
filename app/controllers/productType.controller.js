const { updateImageUsageStatus } = require("../services/uploadImage.service");
const { stringToSlug } = require("../utils/FormatFunction");
const {
  validateTableLimit,
  isArray,
  isValidObjectId,
  sendDeletionResponse,
  validateTablePage,
  checkRequiredFields,
  isFilterData,
  isNotNull,
  checkEmptyFields,
} = require("../utils/HelperFunctions");
const { createError } = require("../services/createError.service");
const imageModel = require("../models/image.model");
const productAlphaModel = require("../models/productAlpha.model");
const ProductTypeModel = require("../models/ProductType.model");
const ProductCategoryModel = require("../models/ProductCategory.model");

const getAllProductTypes = async (req, res) => {
  try {
    const { search } = req.query;
    let page = parseInt(req.query.page, 10) || 0;
    let limit = validateTableLimit(parseInt(req.query.limit, 10)) || 10;
    const searchTextLower = search ? search.toLowerCase() : "";

    let filter = {};
    if (searchTextLower) {
      const regex = new RegExp(searchTextLower, "i");

      const matchingCategories = await ProductCategoryModel.find({
        slug: regex,
      });

      const categoryIds = matchingCategories.map((category) => category._id);

      filter = {
        $or: [{ name: regex }, { categoryId: { $in: categoryIds } }],
      };
    }

    const totalItemCount = await ProductTypeModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItemCount / limit);

    page = validateTablePage(page, totalPages);
    const skip = page * limit;

    const result = await ProductTypeModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("categoryId");

    const products = await productAlphaModel.find();

    const productCounts = {};
    for (let product of products) {
      const productTypeId = product.productType.toString();
      if (productCounts[productTypeId]) {
        productCounts[productTypeId]++;
      } else {
        productCounts[productTypeId] = 1;
      }
    }

    result.forEach((productType) => {
      const productTypeId = productType._id.toString();
      productType.productCount = productCounts[productTypeId] || 0;
    });

    const response = {
      status: "Get all product types successfully.",
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
const getProductTypeByID = async (req, res) => {
  try {
    const productTypeId = req.params.productTypeId;
    if (!isValidObjectId(productTypeId)) {
      return createError(400, "Product Type ID is invalid!");
    }

    const result = await ProductTypeModel.findById(productTypeId);

    return res.status(200).json({
      status: "Get Product Type Successfully!",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

const createProductType = async (req, res) => {
  try {
    const { categoryId, avatarImage, name, description, isPublished } =
      req.body;

    const requiredFields = ["categoryId", "name"];
    const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
    if (missingRequiredFields) {
      return createError(400, missingRequiredFields);
    }
    if (!isValidObjectId(categoryId)) {
      return createError(400, "Category ID is not valid!");
    }

    const category = await ProductCategoryModel.findById(categoryId);
    if (!category) {
      return createError(404, "Parent Category not found!");
    }
    const existedProductType = await ProductTypeModel.findOne({
      name: name,
    });
    if (existedProductType) {
      return createError(400, "This productType is already exists!");
    }
    if (avatarImage) {
      await updateImageUsageStatus(avatarImage, true);
    }
    let slug = stringToSlug(name);
    const newProductType = {
      categoryId: categoryId,
      name: name,
      slug: slug,
      avatarImage: avatarImage,
      description: description || "",
      isPublished: isPublished || false,
    };

    const createdProductType = await ProductTypeModel.create(newProductType);
    category.children.push(createdProductType._id);
    await category.save();

    return res.status(201).json({
      message: "New Product Type Added!",
      data: createdProductType,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const updateProductTypeByID = async (req, res) => {
  try {
    const productTypeId = req.params.productTypeId;

    if (!isValidObjectId(productTypeId)) {
      return createError(400, "Product Type ID is not valid!");
    }

    let productType = await ProductTypeModel.findById(productTypeId);
    if (!productType) {
      return createError(400, "Product Type not found!");
    }

    const { categoryId, avatarImage, name, description, isPublished } =
      req.body;

    const requiredFields = ["name"];
    const emptyFields = checkEmptyFields(req.body, requiredFields);
    if (emptyFields) {
      return createError(400, emptyFields);
    }
    if (categoryId && !isValidObjectId(categoryId)) {
      return createError(400, "Category ID is not valid!");
    }
    if (
      categoryId &&
      categoryId.toString() !== productType.categoryId.toString()
    ) {
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category) {
        return createError(404, "Parent Category not found!");
      }

      const oldCategory = await ProductCategoryModel.findById(
        productType.categoryId
      );
      if (oldCategory) {
        oldCategory.children.pull(productType._id);
        await oldCategory.save();
      }
      category.children.push(productType._id);
      await category.save();
      productType.categoryId = categoryId;
    }

    if (name) {
      productType.name = name;
      productType.slug = stringToSlug(name);
    }
    if (description) {
      productType.description = description;
    }
    if (isNotNull(avatarImage)) {
      if (productType.avatarImage !== "") {
        let existedImage = await imageModel.findOne({
          imageUrl: productType.avatarImage,
        });
        if (existedImage) {
          await updateImageUsageStatus(productType.avatarImage, false);
        }
      }
      if (avatarImage !== "") {
        await updateImageUsageStatus(avatarImage, true);
      }
      productType.avatarImage = avatarImage;
    }
    if (isNotNull(isPublished)) {
      productType.isPublished = isPublished;
    }

    const result = await productType.save();

    return res.status(200).json({
      message: "Product Type Updated!",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteProductTypeByID = async (req, res) => {
  try {
    const productTypeId = req.params.productTypeId;
    if (!isValidObjectId(productTypeId)) {
      return createError(400, "Product Type ID is not valid!");
    }
    let productType = await ProductTypeModel.findById(productTypeId);

    if (!productType) {
      return createError(404, "Product Type not found!");
    }
    if (productType.avatarImage !== "") {
      let existedImage = await imageModel.findOne({
        imageUrl: productType.avatarImage,
      });
      if (existedImage) {
        await updateImageUsageStatus(productType.avatarImage, false);
      }
    }
    const category = await ProductCategoryModel.findById(
      productType.categoryId
    );
    if (category) {
      category.children.pull(productType._id);
      await category.save();
    }
    await ProductTypeModel.findByIdAndDelete(productTypeId);

    return res.status(200).json({
      message: "Product Type deleted!",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteMultipleProductTypes = async (req, res) => {
  try {
    const { productTypeIDs } = req.body;

    if (!isArray(productTypeIDs) || productTypeIDs.length === 0) {
      return createError(400, "Product Type IDs are not valid!");
    }

    const invalidIds = productTypeIDs.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return createError(
        400,
        `Invalid Product Types IDs: ${invalidIds.join(", ")}`
      );
    }

    const deletionResults = await Promise.all(
      productTypeIDs.map(async (productTypeId) => {
        let productType = await ProductTypeModel.findById(productTypeId);

        if (!productType) {
          return {
            productTypeId,
            status: "Not Found",
            message: "This product type does not exist.",
          };
        }

        if (productType.avatarImage !== "") {
          let existedImage = await imageModel.findOne({
            imageUrl: productType.avatarImage,
          });
          if (existedImage) {
            await updateImageUsageStatus(productType.avatarImage, false);
          }
        }

        const category = await ProductCategoryModel.findById(productTypeId);
        if (category) {
          category.children.pull(productTypeId);
          await category.save();
        }

        await ProductTypeModel.findByIdAndDelete(productTypeId);
        return {
          productTypeId,
          status: "Success",
          message: "Deleted successfully.",
        };
      })
    );
    const successfulDeletions = deletionResults.filter(
      (result) => result.status === "Success"
    );
    sendDeletionResponse(
      res,
      successfulDeletions,
      deletionResults,
      "product types"
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

module.exports = {
  getAllProductTypes,
  getProductTypeByID,
  createProductType,
  updateProductTypeByID,
  deleteProductTypeByID,
  deleteMultipleProductTypes,
};
