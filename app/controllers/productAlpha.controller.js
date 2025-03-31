const randtoken = require("rand-token");
const productAlphaModel = require("../models/productAlpha.model");
const ProductCategoryModel = require("../models/ProductCategory.model");
const ProductTypeModel = require("../models/ProductType.model");
const imageModel = require("../models/image.model");
const {
  checkRequiredFields,
  isValidObjectId,
  validateTableLimit,
  validateTablePage,
  isFilterData,
  isNotNull,
  convertArrayStringToOptions,
  sendDeletionResponse,
  isArray,
  checkEmptyFields,
  validateLimit,
  validatePage,
  isEmptyObj,
  convertArrayToOptions,
} = require("../utils/HelperFunctions");
const {
  stripHtmlTags,
  convertStringToNumber,
} = require("../utils/FormatFunction");
const {
  getDiscountPercentage,
  getProductTypeOptions,
  getCategoryOptions,
} = require("../utils/ProductHelperFunctions");
const { updateImageUsageStatus } = require("../services/uploadImage.service");
const { createError } = require("../services/createError.service");
const { tryCatch } = require("../utils/tryCatch");

// Admin
const getAllProducts = tryCatch(async (req, res) => {
  const { category, brand, gender, status, search } = req.query;
  let page = parseInt(req.query.page, 10) || 0;
  let limit = validateTableLimit(parseInt(req.query.limit, 10)) || 10;
  const searchTextLower = search ? search.toLowerCase() : "";

  let filter = {};

  if (category) {
    let existedCategory = await ProductCategoryModel.findOne({
      slug: category,
    });
    if (existedCategory) {
      filter.category = existedCategory._id;
    } else {
      filter.category = null;
    }
  }

  if (brand) filter.brand = brand;
  if (gender) filter.gender = gender;
  if (status) filter.status = status;
  if (searchTextLower) {
    filter.name = new RegExp(searchTextLower, "i");
  }

  const totalItemCount = await productAlphaModel.countDocuments(filter);
  const totalPages = Math.ceil(totalItemCount / limit);
  page = validateTablePage(page, totalPages);
  const skip = parseInt(page, 10) * parseInt(limit, 10);

  const result = await productAlphaModel
    .find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate("category")
    .populate("productType");

  const response = {
    status: "Get all products successfully.",
    data: result,
    totalItemCount,
    page,
    limit,
    isSearchOn: isFilterData(searchTextLower),
    isFilterOn: isFilterData(category, brand, gender, status),
    filterValue: req.query,
  };
  return res.status(200).json(response);
});
const getProductByID = tryCatch(async (req, res) => {
  const productId = req.params.productId;
  if (!isValidObjectId(productId)) {
    return createError(400, "Product ID is not valid");
  }

  const result = await productAlphaModel.findById(productId);

  return res.status(200).json({
    status: "Get Product Successfully!",
    data: result,
  });
});
const createProduct = tryCatch(async (req, res) => {
  const {
    name,
    description,
    productType,
    avatarImage,
    images,
    brand,
    gender,
    prices,
    stock,
    tags,
    status,
    isPublished,
    hasVariation,
    variantOptions,
    variations,
  } = req.body;

  let requiredFields = ["name", "productType", "brand", "gender"];

  let isOnSale = false;
  let finalHasVariation = isNotNull(hasVariation) && hasVariation === true;
  if (!finalHasVariation) {
    if (!prices || !prices.price) {
      return createError(400, "Missing required fields!");
    }
    requiredFields = ["name", "productType", "brand", "gender", "stock"];
    if (prices.price < 1000) {
      return createError(400, "Original price must be at least 1,000đ.");
    }

    if (prices.comparePrice) {
      isOnSale =
        convertStringToNumber(prices.comparePrice) !==
        convertStringToNumber(prices.price)
          ? true
          : false;
      if (
        convertStringToNumber(prices.comparePrice) <
        convertStringToNumber(prices.price)
      ) {
        return createError(400, "Compare price must be higher than price!");
      }
    }
  }

  const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
  if (missingRequiredFields) {
    return createError(400, missingRequiredFields);
  }

  if (!isValidObjectId(productType)) {
    return createError(400, "Selected product type ID is invalid!");
  }

  const existedProductType = await ProductTypeModel.findById(productType);
  if (!existedProductType) {
    return createError(400, "Selected product type not found!");
  }

  let categoryId = existedProductType.categoryId;

  if (description && stripHtmlTags(description).length > 1000) {
    return createError(400, "Description too long. Max 1000 characters!");
  }

  if (avatarImage) {
    await updateImageUsageStatus(avatarImage, true);
  }

  if (Array.isArray(images) && images.length > 0) {
    if (images.length > 6) {
      return createError(409, "You can upload up to 6 images only!");
    }
    for (let image of images) {
      await updateImageUsageStatus(image, true);
    }
  }

  let productDiscount = 0;
  if (isOnSale === true) {
    productDiscount = getDiscountPercentage(prices.price, prices.comparePrice);
  }
  let variantStats = {
    totalQuantity: 0,
    totalCount: 0,
    minPrice: 0,
    maxPrice: 0,
  };
  let newPrices = {
    price: 0,
    comparePrice: 0,
    discount: 0,
    stock: 0,
  };
  if (finalHasVariation) {
    if (!isArray(variantOptions) || variantOptions.length === 0) {
      return createError(400, "No variant options found.");
    } else if (variantOptions.length > 2) {
      return createError(400, "You can only add 2 variations per product.");
    } else {
      for (let option of variantOptions) {
        if (
          !option.optionName ||
          !isArray(option.optionValues) ||
          option.optionValues.length === 0
        ) {
          return createError(400, "Variant option fields are required.");
        }
      }
    }
    if (!isArray(variations) || variations.length === 0) {
      return createError(400, "No variants found.");
    }
  }
  if (isArray(variations) && variations.length > 0) {
    let totalVariantQuantity = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (let variation of variations) {
      if (
        !variation.variants ||
        variation.variants.length === 0 ||
        isNaN(variation.quantity) ||
        isNaN(variation.price) ||
        isNaN(variation.comparePrice)
      ) {
        return createError(400, "Variation fields are required.");
      }
      if (variation.comparePrice < variation.price) {
        return createError(
          400,
          "Variant compare price must be higher than price!"
        );
      }
      for (let variant of variation.variants) {
        if (!variant.name || !variant.value) {
          return createError(400, "Variant name and value are required.");
        }
      }
      totalVariantQuantity += variation.quantity;
      minPrice = Math.min(minPrice, variation.price);
      maxPrice = Math.max(maxPrice, variation.price);
    }
    variantStats = {
      totalQuantity: totalVariantQuantity,
      totalCount: variations.length,
      minPrice: minPrice,
      maxPrice: maxPrice,
    };
    newPrices.price = variations[0].price;
    newPrices.comparePrice = variations[0].comparePrice;

    newPrices.discount = getDiscountPercentage(
      variations[0].price,
      variations[0].comparePrice
    );
    newPrices.stock = totalVariantQuantity;
  }

  const newProduct = {
    productCode: randtoken.generate(8),
    name: name,
    description: description || "",
    category: categoryId,
    productType: productType,
    brand: brand,
    avatarImage: avatarImage || "",
    images: images || [],
    gender: gender,
    prices: {
      price: finalHasVariation ? newPrices.price : prices.price,
      comparePrice: finalHasVariation
        ? newPrices.comparePrice
        : isOnSale
        ? prices.comparePrice
        : prices.price,
      discount: finalHasVariation ? newPrices.discount : productDiscount,
    },
    status: status || "Coming Soon",
    isPublished: isPublished || false,
    stock: finalHasVariation ? newPrices.stock : stock,
    tags: tags || [],
    isOnSale: isOnSale || false,
    hasVariation: finalHasVariation,
    variantOptions: finalHasVariation ? variantOptions : [],
    variations: finalHasVariation ? variations : [],
    variantStats: finalHasVariation ? variantStats : {},
  };

  const result = await productAlphaModel.create(newProduct);
  return res.status(201).json({
    message: "Create Product Successfully!",
    data: result,
  });
});
const updateProductByID = tryCatch(async (req, res) => {
  const productId = req.params.id;
  const {
    name,
    avatarImage,
    description,
    productType,
    images,
    brand,
    gender,
    prices,
    stock,
    tags,
    status,
    isPublished,
    hasVariation,
    variantOptions,
    variations,
  } = req.body;

  const requiredFields = ["name"];
  const emptyFields = checkEmptyFields(req.body, requiredFields);
  if (emptyFields) {
    return createError(400, emptyFields);
  }

  let isOnSale = false;
  if (!isValidObjectId(productId)) {
    return createError(400, "Product ID is not valid");
  }

  const product = await productAlphaModel.findById(productId);
  if (!product) {
    return createError(404, "Product not found!");
  }

  let categoryId = "";
  if (productType) {
    if (!isValidObjectId(productType)) {
      return createError(400, "Selected product type ID is invalid!");
    }
    const existedProductType = await ProductTypeModel.findById(productType);
    if (!existedProductType) {
      return createError(409, "Selected product type not found!");
    }
    categoryId = existedProductType.categoryId;
  }

  if (description && stripHtmlTags(description).length > 1000) {
    return createError(400, "Description too long. Max 1000 characters!");
  }

  if (prices && prices.price && prices.price < 1000) {
    return createError(400, "Price must be at least 1,000đ.");
  }
  let productDiscount = 0;
  if (isNotNull(prices) && !isEmptyObj(prices)) {
    const parsedComparePrice = prices.comparePrice
      ? convertStringToNumber(prices.comparePrice)
      : product.prices.comparePrice;
    const parsedPrice = prices.price
      ? convertStringToNumber(prices.price)
      : product.prices.price;

    const isPriceChanged =
      prices.price && prices.price !== product.prices.price;
    const isComparePriceChanged =
      prices.comparePrice &&
      prices.comparePrice !== product.prices.comparePrice;

    if (isPriceChanged || isComparePriceChanged) {
      if (parsedComparePrice < parsedPrice) {
        return createError(400, "Compare price must be higher than price!");
      }
      isOnSale = parsedComparePrice > parsedPrice;
      productDiscount = getDiscountPercentage(parsedPrice, parsedComparePrice);
    }
  }

  if (isNotNull(avatarImage)) {
    if (product.avatarImage !== "") {
      let existedImage = await imageModel.findOne({
        imageUrl: product.avatarImage,
      });
      if (existedImage) {
        await updateImageUsageStatus(product.avatarImage, false);
      }
    }
    if (avatarImage !== "") {
      await updateImageUsageStatus(avatarImage, true);
    }
    product.avatarImage = avatarImage;
  }

  if (isArray(images) && images.length > 0) {
    if (images.length > 6) {
      return createError(409, "You can upload up to 6 images only!");
    }
    for (let image of images) {
      await updateImageUsageStatus(image, true);
    }
  }

  const productImages = product.images;
  if (productImages.length > 0) {
    const newImagesSet = new Set(images);
    for (const currentImage of productImages) {
      if (!newImagesSet.has(currentImage)) {
        await updateImageUsageStatus(currentImage, false);
      }
    }
  }
  let variantStats = {
    totalQuantity: 0,
    variantTotalCount: 0,
    minPrice: 0,
    maxPrice: 0,
  };

  if (
    (isNotNull(hasVariation) && hasVariation === true) ||
    (isArray(variantOptions) && variantOptions.length > 0)
  ) {
    if (!isArray(variantOptions) || variantOptions.length === 0) {
      return createError(400, "No variant options found.");
    } else if (variantOptions.length > 2) {
      return createError(400, "You can only add 2 variations per product.");
    } else {
      for (let option of variantOptions) {
        if (
          !option.optionName ||
          !isArray(option.optionValues) ||
          option.optionValues.length === 0
        ) {
          return createError(400, "Variant option fields are required.");
        }
      }
    }
    if (!isArray(variations) || variations.length === 0) {
      return createError(400, "No variants found.");
    }
  }
  let newPrices = {
    price: 0,
    comparePrice: 0,
    discount: 0,
    isOnSale: false,
  };
  if (isArray(variations) && variations.length > 0) {
    let totalVariantQuantity = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (let variation of variations) {
      if (
        !variation.variants ||
        variation.variants.length === 0 ||
        isNaN(variation.quantity) ||
        isNaN(variation.price) ||
        isNaN(variation.comparePrice)
      ) {
        return createError(400, "Variation fields are required.");
      }
      if (variation.comparePrice < variation.price) {
        return createError(
          400,
          "Variant compare price must be higher than price!"
        );
      }
      for (let variant of variation.variants) {
        if (!variant.name || !variant.value) {
          return createError(400, "Variant name and value are required.");
        }
      }
      totalVariantQuantity += variation.quantity;
      minPrice = Math.min(minPrice, variation.price);
      maxPrice = Math.max(maxPrice, variation.price);
    }
    variantStats = {
      totalQuantity: totalVariantQuantity,
      totalCount: variations.length,
      minPrice: minPrice,
      maxPrice: maxPrice,
    };
    newPrices.price = variations[0].price;
    newPrices.comparePrice = variations[0].comparePrice;
    newPrices.discount = getDiscountPercentage(
      variations[0].price,
      variations[0].comparePrice
    );
    newPrices.isOnSale = newPrices.comparePrice > newPrices.price;
  }

  if (name) product.name = name;
  if (description) product.description = description;
  if (categoryId) product.category = categoryId;
  if (productType) product.productType = productType;
  if (brand) product.brand = brand;
  if (gender) product.gender = gender;
  if (isArray(images)) product.images = images;
  if (isNotNull(prices) && !isEmptyObj(prices) && prices.price)
    product.prices.price = prices.price;
  if (isNotNull(prices) && !isEmptyObj(prices) && prices.comparePrice) {
    product.prices.comparePrice = prices.comparePrice;
  }
  if (isNotNull(prices) && !isEmptyObj(prices)) {
    product.prices.discount = productDiscount;
  }
  if (stock) product.stock = stock;
  if (tags) product.tags = tags;
  if (status) product.status = status;
  if (isNotNull(isOnSale)) product.isOnSale = isOnSale;
  if (isNotNull(isPublished)) product.isPublished = isPublished;
  if (isNotNull(hasVariation)) {
    product.hasVariation = hasVariation;
  }
  if (isArray(variantOptions)) product.variantOptions = variantOptions;
  if (isArray(variations)) {
    product.variations = variations;
    product.variantStats = variantStats;
    product.stock = variantStats.totalQuantity;
    product.prices.price = newPrices.price;
    product.prices.comparePrice = newPrices.comparePrice;
    product.prices.discount = newPrices.discount;
    product.isOnSale = newPrices.isOnSale;
  }

  const updatedProduct = await product.save();

  return res.status(200).json({
    message: "Product Updated!",
    data: updatedProduct,
  });
});
const deleteProductByID = tryCatch(async (req, res) => {
  const productId = req.params.id;
  if (!isValidObjectId(productId)) {
    return createError(400, "Product ID is invalid!");
  }

  const product = await productAlphaModel.findById(productId);
  if (!product) {
    return createError(404, "Product does not exist.");
  }
  if (product.avatarImage !== "") {
    let existedImage = await imageModel.findOne({
      imageUrl: product.avatarImage,
    });
    if (existedImage) {
      await updateImageUsageStatus(product.avatarImage, false);
    }
  }

  if (product.images.length > 0) {
    for (let image of product.images) {
      const existedImage = await imageModel.findOne({
        imageUrl: image,
      });
      if (existedImage) {
        await updateImageUsageStatus(image, false);
      }
    }
  }

  await productAlphaModel.findByIdAndDelete(productId);

  return res.status(200).json({
    message: "Product deleted successfully!",
  });
});
const deleteMultipleProducts = tryCatch(async (req, res) => {
  const { productIDs } = req.body;

  if (!isArray(productIDs) || productIDs.length === 0) {
    return createError(400, "Product IDs are not valid!");
  }

  const invalidIds = productIDs.filter((id) => !isValidObjectId(id));
  if (invalidIds.length > 0) {
    return createError(400, `Invalid Product IDs: ${invalidIds.join(", ")}`);
  }

  const deletionResults = await Promise.all(
    productIDs.map(async (productId) => {
      let product = await productAlphaModel.findById(productId);

      if (!product) {
        return {
          productId,
          status: "Not Found",
          message: "This product does not exist.",
        };
      }

      if (product.avatarImage !== "") {
        let existedImage = await imageModel.findOne({
          imageUrl: product.avatarImage,
        });
        if (existedImage) {
          await updateImageUsageStatus(product.avatarImage, false);
        }
      }

      if (product.images.length > 0) {
        for (let image of product.images) {
          const existedImage = await imageModel.findOne({
            imageUrl: image,
          });
          if (existedImage) {
            await updateImageUsageStatus(image, false);
          }
        }
      }

      await productAlphaModel.findByIdAndDelete(productId);
      return {
        productId,
        status: "Success",
        message: "Product deleted successfully.",
      };
    })
  );
  const successfulDeletions = deletionResults.filter(
    (result) => result.status === "Success"
  );
  sendDeletionResponse(res, successfulDeletions, deletionResults, "products");
});

const getProductSelectOptions = tryCatch(async (req, res) => {
  const categories = await ProductCategoryModel.find({
    isPublished: { $ne: false },
  });
  const productTypes = await ProductTypeModel.find({
    isPublished: { $ne: false },
  }).populate("categoryId");

  const categoryOptions = getCategoryOptions("name", "_id", categories);
  const productTypeOptions = getProductTypeOptions("name", "_id", productTypes);
  let genderOptions = convertArrayStringToOptions(["men", "women", "unisex"]);
  let statusOptions = convertArrayStringToOptions([
    "Selling",
    "Sold Out",
    "Discontinued",
    "Coming Soon",
  ]);

  const allProducts = await productAlphaModel.find();
  const brandLists = allProducts.reduce((accumulator, item) => {
    const existingOption = accumulator.find((option) => option === item.brand);
    if (!existingOption) {
      accumulator.push(item.brand);
    }
    return accumulator;
  }, []);
  let brandOptions = convertArrayStringToOptions(brandLists);

  return res.status(200).json({
    message: "Get product options successfully.",
    categoryOptions,
    productTypeOptions,
    genderOptions,
    statusOptions,
    brandLists,
    brandOptions,
  });
});
// User
const getAllProductsForUser = tryCatch(async (req, res) => {
  const { category, brand, gender, sort_by = "latest", search } = req.query;
  let priceFrom = convertStringToNumber(req.query.priceFrom);
  let priceTo = convertStringToNumber(req.query.priceTo);
  let page = parseInt(req.query.page, 10) || 1;
  let limit = validateLimit(parseInt(req.query.limit, 10)) || 10;
  const searchTextLower = search ? search.toLowerCase() : "";

  let filter = {
    isPublished: true,
  };

  if (!isNotNull(priceFrom) || isNaN(priceFrom)) {
    priceFrom = undefined;
  }
  if (!isNotNull(priceTo) || isNaN(priceTo)) {
    priceTo = undefined;
  }

  if (category) {
    let existedCategory = await ProductCategoryModel.findOne({
      slug: category,
    });
    if (existedCategory) {
      filter.category = existedCategory._id;
    } else {
      filter.category = null;
    }
  }

  if (brand) filter.brand = brand;
  if (gender) filter.gender = gender;
  if (isNotNull(priceFrom) && isNotNull(priceTo)) {
    filter["prices.price"] = {
      $gte: parseInt(priceFrom),
      $lte: parseInt(priceTo),
    };
  } else if (isNotNull(priceFrom)) {
    filter["prices.price"] = { $gte: parseInt(priceFrom) };
  } else if (isNotNull(priceTo)) {
    filter["prices.price"] = { $lte: parseInt(priceTo) };
  }

  let sort = {};
  switch (sort_by) {
    case "price-asc":
      sort["prices.price"] = 1;
      break;
    case "price-desc":
      sort["prices.price"] = -1;
      break;
    case "latest":
      sort.createdAt = -1;
      break;
    case "top-sellers":
      sort.sale = -1;
      break;
    default:
      break;
  }

  if (searchTextLower) {
    filter.name = new RegExp(searchTextLower, "i");
  }

  const totalItemCount = await productAlphaModel.countDocuments(filter);
  const totalPages = Math.ceil(totalItemCount / limit);
  page = validatePage(page, totalPages);
  const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

  const result = await productAlphaModel
    .find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort(sort);

  let newFilterValue = {
    category,
    brand,
    gender,
    priceFrom,
    priceTo,
    search,
  };
  let filterOptions = {
    priceRange: {
      min: Math.min(...result.map((product) => product.prices.price)),
      max: Math.max(...result.map((product) => product.prices.price)),
    },
  };

  const response = {
    status: "Get all products successfully.",
    data: result,
    totalItemCount,
    page,
    limit,
    isSearchOn: isFilterData(searchTextLower),
    isFilterOn: isFilterData(category, brand, gender, priceFrom, priceTo),
    filterValue: newFilterValue,
    sortValue: sort_by,
    filterOptions,
  };
  return res.status(200).json(response);
});
const getProductByCodeForUser = tryCatch(async (req, res) => {
  const productCode = req.params.productCode;

  const result = await productAlphaModel
    .findOne({ productCode })
    .populate("category")
    .populate("productType");
  if (!result) {
    return createError(200, "No product found!");
  }
  return res.status(200).json({
    message: "Get Product Successfully!",
    data: result,
  });
});
const getProductFilterOptionsForUser = tryCatch(async (req, res) => {
  const categories = await ProductCategoryModel.find({
    isPublished: true,
    productCount: { $gt: 0 },
  });

  const categoryOptions = convertArrayToOptions("name", "slug", categories);

  let genderOptions = convertArrayStringToOptions(["men", "women", "unisex"]);

  const allProducts = await productAlphaModel.find();
  const brandLists = allProducts.reduce((accumulator, item) => {
    const existingOption = accumulator.find((option) => option === item.brand);
    if (!existingOption) {
      accumulator.push(item.brand);
    }
    return accumulator;
  }, []);
  let brandOptions = convertArrayStringToOptions(brandLists);

  return res.status(200).json({
    message: "Get product options successfully.",
    data: {
      categoryOptions,
      genderOptions,
      brandOptions,
    },
  });
});
const getRelatedProductsByCode = tryCatch(async (req, res) => {
  const productCode = req.params.productCode;
  const product = await productAlphaModel
    .findOne({ productCode })
    .populate("category");
  if (!product) {
    return createError(200, "No product found!");
  }
  const result = await productAlphaModel
    .find({
      category: product.category._id,
      _id: { $ne: product._id },
    })
    .limit(10)
    .sort({ createdAt: -1 });
  if (result.length === 0) {
    return res.status(200).json({
      message: "No related products found!",
    });
  }
  return res.status(200).json({
    message: "Get Related Products Successfully!",
    data: result,
  });
});

module.exports = {
  getAllProducts,
  getProductByID,
  createProduct,
  updateProductByID,
  deleteProductByID,
  deleteMultipleProducts,
  getProductSelectOptions,
  getAllProductsForUser,
  getProductFilterOptionsForUser,
  getProductByCodeForUser,
  getRelatedProductsByCode,
};
