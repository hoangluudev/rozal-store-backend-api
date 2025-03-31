const mongoose = require("mongoose");
const productModel = require("../models/product.model");
var randtoken = require("rand-token");
const { validateLimit, validatePage } = require("../utils/HelperFunctions");
const { toCapitalize, stripHtmlTags } = require("../utils/FormatFunction");

//Clients
const getProductsWithFilter = async (req, res) => {
  try {
    const { category, brand, gender, priceFrom, priceTo, sort_by, search } =
      req.query;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = validateLimit(parseInt(req.query.limit, 10)) || 8;

    const searchTextLower = search ? search.toLowerCase() : "";

    let filter = { productStatus: "Active" };
    let sort = {};

    if (gender) filter.forGender = gender;
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (priceFrom && priceTo)
      filter.promotionPrice = {
        $gte: parseInt(priceFrom),
        $lte: parseInt(priceTo),
      };
    else if (priceFrom) filter.promotionPrice = { $gte: parseInt(priceFrom) };
    else if (priceTo) filter.promotionPrice = { $lte: parseInt(priceTo) };

    if (searchTextLower) {
      filter.name = new RegExp(searchTextLower, "i");
    }

    if (sort_by === "latest") {
      sort.createdAt = -1;
    } else if (sort_by === "price-asc") {
      sort.promotionPrice = 1;
    } else if (sort_by === "price-desc") {
      sort.promotionPrice = -1;
    } else if (sort_by === "featured") {
      sort.isPopular = -1;
      sort.createdAt = 1;
    }

    const allProducts = await productModel.find({ productStatus: "Active" });
    const categoryList = allProducts.reduce((accumulator, item) => {
      const existingOption = accumulator.find(
        (option) => option === item.category
      );
      if (!existingOption) {
        accumulator.push(item.category);
      }
      return accumulator;
    }, []);
    const brandList = allProducts.reduce((accumulator, item) => {
      const existingOption = accumulator.find(
        (option) => option === item.brand
      );
      if (!existingOption) {
        accumulator.push(item.brand);
      }
      return accumulator;
    }, []);
    const genderList = allProducts.reduce((accumulator, item) => {
      const existingOption = accumulator.find(
        (option) => option === item.forGender
      );
      if (!existingOption) {
        accumulator.push(item.forGender);
      }
      return accumulator;
    }, []);

    const totalProductCount = await productModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProductCount / limit);
    page = validatePage(page, totalPages);
    const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

    const filteredProducts = await productModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const response = {
      status: "Filtered Products Successfully!",
      data: filteredProducts,
      currentPage: page,
      limit: limit,
      isPageUnavailable: page > totalPages ? true : false,
      totalItemCount: totalProductCount,
      isFilterApplied: !!(
        gender ||
        category ||
        brand ||
        priceFrom ||
        priceTo ||
        sort_by
      ),
      isSearching: !!searchTextLower,
      categoryList: categoryList,
      brandList: brandList,
      genderList: genderList,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllProductByFeatures = async (req, res) => {
  try {
    let limit = 8;
    const result = await productModel
      .find({
        isPopular: true,
        productStatus: "Active",
      })
      .limit(parseInt(limit));
    return res.status(200).json({
      status: "Get all featured products successfully!",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllProductByLatest = async (req, res) => {
  try {
    let limit = 8;

    const result = await productModel
      .find({ productStatus: "Active" })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    return res.status(200).json({
      status: "Get all latest products successfully!",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getProductByID = async (req, res) => {
  try {
    const productId = req.params.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Product ID is not valid",
      });
    }

    const result = await productModel.findById(productId);

    if (result) {
      return res.status(200).json({
        status: "Get Product Successfully!",
        data: result,
      });
    } else {
      return res.status(404).json({
        status: "Not Found",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getRelatedProductByID = async (req, res) => {
  try {
    const productId = req.params.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Product ID is not valid",
      });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        status: "Not Found",
        message: "Product not found",
      });
    }

    const relatedProducts = await productModel
      .find({
        category: product.category,
        _id: { $ne: productId },
      })
      .limit(8);

    return res.status(200).json({
      status: "Get Related Products Successfully!",
      data: relatedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

//Admin
const getAllProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 0) {
      return res.status(400).json({
        status: "Invalid page number",
      });
    }

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        status: "Invalid limit value",
      });
    }

    const startIndex = page * limit;

    const products = await productModel.find().skip(startIndex).limit(limit);
    const gTotalProduct = await productModel.find();
    const totalProducts = await productModel.countDocuments();

    const categoryList = gTotalProduct.reduce((accumulator, item) => {
      const existingOption = accumulator.find(
        (option) => option === item.category
      );
      if (!existingOption) {
        accumulator.push(item.category);
      }
      return accumulator;
    }, []);
    const brandList = gTotalProduct.reduce((accumulator, item) => {
      const existingOption = accumulator.find(
        (option) => option === item.brand
      );
      if (!existingOption) {
        accumulator.push(item.brand);
      }
      return accumulator;
    }, []);

    for (let product of products) {
      if (product.stock.stockQuantity === 0) {
        product.stock.stockStatus = "Out Of Stock";
        await product.save();
      }
      if (product.stock.stockQuantity > 0 && product.stock.stockQuantity < 10) {
        product.stock.stockStatus = "Low On Stock";
        await product.save();
      }
      if (product.stock.stockQuantity > 10) {
        product.stock.stockStatus = "In Stock";
        await product.save();
      }
    }

    const response = {
      status: "Get all products Successfully!",
      data: products,
      totalItems: totalProducts,
      currentPage: page,
      limit: limit,
      categoryList: categoryList,
      brandList: brandList,
    };
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllProductsWithSearch = async (req, res) => {
  try {
    const { searchText } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    const searchTextLower = searchText ? searchText.toLowerCase() : "";

    if (isNaN(page) || page < 0) {
      return res.status(400).json({
        status: "Invalid page number",
      });
    }

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        status: "Invalid limit value",
      });
    }

    const startIndex = page * limit;

    const filter = searchTextLower
      ? { name: new RegExp(searchTextLower, "i") }
      : {};

    const products = await productModel
      .find(filter)
      .skip(startIndex)
      .limit(parseInt(limit, 10));

    const totalProducts = await productModel.countDocuments(filter);

    const response = {
      status: "Get Searched Products Successfully!",
      totalItems: totalProducts,
      data: products,
      currentPage: page,
      limit: limit,
      isSearching: searchTextLower !== "",
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllProductsWithFilter = async (req, res) => {
  try {
    let {
      gender,
      category,
      brand,
      stockStatus,
      status,
      page = 0,
      limit = 10,
    } = req.query;

    if (isNaN(page) || page < 0 || isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        status: "Invalid page number or limit value",
      });
    }

    const startIndex = parseInt(page, 10) * parseInt(limit, 10);

    let filter = {};
    if (gender) filter.forGender = gender;
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (stockStatus) filter["stock.stockStatus"] = stockStatus;
    if (status) filter.productStatus = status;

    const products = await productModel
      .find(filter)
      .skip(startIndex)
      .limit(parseInt(limit, 10));

    const totalProducts = await productModel.countDocuments(filter);

    const response = {
      status: "Filtered Products Successfully!",
      data: products,
      totalItems: totalProducts,
      limit: parseInt(limit, 10),
      currentPage: parseInt(page, 10),
      isFilterApplied: !!(gender || category || brand || stockStatus || status),
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      imgUrl,
      buyPrice,
      promotionPrice,
      productStatus,
      stockStatus,
      stockQuantity,
      description,
      forGender,
      size,
      color,
      isPopular,
    } = req.body;

    if (
      !name ||
      !category ||
      !brand ||
      !buyPrice ||
      !forGender ||
      !stockQuantity ||
      !description
    ) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Missing required fields!",
      });
    }
    if (!(Number.isInteger(buyPrice) && buyPrice >= 0)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "price is invalid!",
      });
    }
    if (
      promotionPrice &&
      (!Number.isInteger(promotionPrice) || promotionPrice > buyPrice)
    ) {
      return res.status(400).json({
        status: "Bad Request",
        message: "promotionPrice is invalid!",
      });
    }
    if (stripHtmlTags(description).length > 1000) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Description too long. Max 1000 characters!",
      });
    }

    const newProduct = await productModel.create({
      _id: new mongoose.Types.ObjectId(),
      productCode: randtoken.generate(16),
      name: toCapitalize(name),
      category: category.toUpperCase(),
      brand: brand.toUpperCase(),
      imgUrl: imgUrl,
      buyPrice: buyPrice,
      promotionPrice: promotionPrice || buyPrice,
      description: description,
      forGender: forGender,
      size: size || [],
      color: color || [],
      isPopular: isPopular || false,
      stock: {
        stockStatus: stockStatus,
        stockQuantity: stockQuantity,
      },
      productStatus: productStatus,
    });

    return res.status(201).json({
      status: "Create Product Successfully!",
      message: "Create Product Successfully!",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error!",
      message: error.message,
    });
  }
};
const updateProductByID = async (req, res) => {
  try {
    const productId = req.params.productId;
    const {
      name,
      category,
      brand,
      imgUrl,
      buyPrice,
      promotionPrice,
      productStatus,
      stockStatus,
      stockQuantity,
      description,
      forGender,
      size,
      color,
      isPopular,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Product ID is not valid",
      });
    }
    const product = await productModel.findById(productId);

    if (buyPrice && !(Number.isInteger(buyPrice) && buyPrice >= 0)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "price is invalid!",
      });
    }
    if (
      promotionPrice &&
      (!Number.isInteger(promotionPrice) ||
        promotionPrice > product.buyPrice ||
        promotionPrice > buyPrice)
    ) {
      return res.status(400).json({
        status: "Bad Request",
        message: "promotionPrice is invalid!",
      });
    }
    if (description && stripHtmlTags(description).length > 1000) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Description too long. Max 1000 characters!",
      });
    }

    const productUpdate = {};
    if (name) productUpdate.name = toCapitalize(name);
    if (category) productUpdate.category = category.toUpperCase();
    if (brand) productUpdate.brand = brand.toUpperCase();
    if (imgUrl) productUpdate.imgUrl = imgUrl;
    if (buyPrice || buyPrice === 0) productUpdate.buyPrice = buyPrice;
    if (promotionPrice) {
      productUpdate.promotionPrice = promotionPrice;
    } else if (promotionPrice === null || promotionPrice === "") {
      productUpdate.promotionPrice = buyPrice;
    }
    if (description) productUpdate.description = description;
    if (forGender) productUpdate.forGender = forGender;
    if (isPopular !== undefined) productUpdate.isPopular = isPopular;
    if (size) productUpdate.size = size;
    if (color) productUpdate.color = color;
    if (productStatus) productUpdate.productStatus = productStatus;
    if (stockStatus) productUpdate["stock.stockStatus"] = stockStatus;
    if (stockQuantity || stockQuantity === 0)
      productUpdate["stock.stockQuantity"] = stockQuantity;

    const result = await productModel.findByIdAndUpdate(
      productId,
      productUpdate,
      { new: true }
    );
    if (result) {
      return res.status(200).json({
        status: "Update Product Successfully!",
        data: result,
        message: "Product Updated!",
      });
    } else {
      return res.status(404).json({
        status: "Product not found!",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const deleteProductByID = async (req, res) => {
  try {
    const productId = req.params.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Product ID is not valid!",
      });
    }

    const result = await productModel.findByIdAndDelete(productId);

    if (result) {
      return res.status(200).json({
        status: "Delete Product Successfully!",
        data: result,
      });
    } else {
      return res.status(404).json({
        status: "Not Found",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const deleteMultipleProductByID = async (req, res) => {
  try {
    const { productIDs } = req.body;
    if (!Array.isArray(productIDs) || productIDs.length === 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: "Product IDs should be a non-empty array",
      });
    }

    const invalidIds = productIDs.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: `Invalid Product IDs: ${invalidIds.join(", ")}`,
      });
    }

    const deleteResult = await Promise.all(
      productIDs.map(async (productID) => {
        const result = await productModel.findByIdAndDelete(productID);
        return result
          ? { productID, status: "Delete Success" }
          : { productID, status: "Not found" };
      })
    );

    return res.status(200).json({
      status: "Success",
      message: "Delete products Success",
      result: deleteResult,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

module.exports = {
  getProductsWithFilter,
  getProductByID,
  getRelatedProductByID,
  getAllProductByFeatures,
  getAllProductByLatest,
  getAllProduct,
  getAllProductsWithSearch,
  getAllProductsWithFilter,
  createProduct,
  updateProductByID,
  deleteProductByID,
  deleteMultipleProductByID,
};
