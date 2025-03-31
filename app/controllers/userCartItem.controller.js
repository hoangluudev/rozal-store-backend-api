const productModel = require("../models/productAlpha.model");
const cartItemModel = require("../models/cartItem.model");
const { createError } = require("../services/createError.service");
const {
  isValidObjectId,
  isNotNull,
  isNumber,
  isBoolean,
  validatePage,
} = require("../utils/HelperFunctions");
const { tryCatch } = require("../utils/tryCatch");

const createCartItem = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { productCode, quantity, variants } = req.body;

  const product = await productModel.findOne({ productCode });

  if (!product || !product.isPublished) {
    return createError(400, "This product is not available!");
  }
  if (product.status === "Sold Out") {
    return createError(400, "This product is out of stock!");
  }
  if (product.status === "Discontinued") {
    return createError(400, "This product is discontinued.");
  }
  if (product.status === "Coming Soon") {
    return createError(400, "This product has not been released yet.");
  }
  if (!quantity || isNaN(quantity)) {
    return createError(400, "Please select quantity.");
  }

  let newCartItem = {
    userId: userId,
    productId: product._id,
    productCode: product.productCode,
    name: product.name,
  };
  let successMessage = "Added to Cart";

  // Check if product has variants
  if (product.variantOptions.length > 0) {
    if (!variants || variants.length !== product.variantOptions.length) {
      return createError(400, "Please select all variants first!");
    }
    const isSelectVariantEmpty = variants.some(
      (variant) => variant.value === ""
    );
    if (isSelectVariantEmpty) {
      return createError(400, "Please select all variants!");
    }

    const matchedVariation = product.variations.find((v) =>
      v.variants.every(
        (variant, index) =>
          variant.name === variants[index]?.name &&
          variant.value === variants[index]?.value
      )
    );

    if (!matchedVariation) {
      return createError(400, "Selected variant is not available!");
    } else if (matchedVariation.quantity === 0) {
      return createError(400, "Selected variant is out of stock!");
    } else if (quantity > matchedVariation.quantity) {
      return createError(400, "Not enough stock for this variant!");
    }

    let existedCartItem = await cartItemModel.findOne({
      userId,
      productId: product._id,
      variants: {
        $all: variants.map((variant) => ({
          $elemMatch: { name: variant.name, value: variant.value },
        })),
      },
    });

    if (existedCartItem) {
      const newQuantity = existedCartItem.quantity + quantity;
      if (newQuantity > matchedVariation.quantity) {
        existedCartItem.stock = matchedVariation.quantity;

        await existedCartItem.save();
        return createError(
          400,
          `Insufficient stock! This variant only have ${matchedVariation.quantity} left. Your cart has ${existedCartItem.quantity}.`
        );
      }
      existedCartItem.quantity = newQuantity;
      existedCartItem.isSelected = true;
      successMessage = "Cart Updated";
      let updatedCart = await existedCartItem.save();
      return res.status(201).json({
        message: successMessage,
        data: updatedCart,
      });
    } else {
      newCartItem = {
        ...newCartItem,
        image:
          matchedVariation.image !== ""
            ? matchedVariation.image
            : product.avatarImage,
        price: matchedVariation.price,
        comparePrice: matchedVariation.comparePrice,
        quantity: quantity,
        stock: matchedVariation.quantity,
        variants: variants,
      };
    }
  } else {
    if (quantity > product.stock) {
      return createError(400, "Not enough stock for this product!");
    }

    let existedCartItem = await cartItemModel.findOne({
      userId,
      productId: product._id,
    });

    if (existedCartItem) {
      const newQuantity = existedCartItem.quantity + quantity;
      if (newQuantity > product.stock) {
        existedCartItem.stock = product.stock;
        existedCartItem.isSelected = true;
        await existedCartItem.save();
        return createError(
          400,
          `Insufficient stock for this product! Your cart already have ${existedCartItem.quantity} items of this product.`
        );
      }
      existedCartItem.quantity = newQuantity;
      successMessage = "Cart Updated";
      let updatedCart = await existedCartItem.save();
      return res.status(201).json({
        message: successMessage,
        data: updatedCart,
      });
    } else {
      newCartItem = {
        ...newCartItem,
        image: product.avatarImage,
        price: product.prices.price,
        comparePrice: product.prices.comparePrice,
        quantity: quantity,
        stock: product.stock,
      };
    }
  }
  const result = await cartItemModel.create(newCartItem);

  return res.status(201).json({
    message: successMessage,
    data: result,
  });
});
const getUserCartItem = tryCatch(async (req, res) => {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = 10;
  const user = req.user;
  const userId = user._id;

  const totalItemCount = await cartItemModel.countDocuments({
    userId,
    status: "Available",
  });
  const totalPage = Math.ceil(totalItemCount / limit);
  page = validatePage(page, totalPage);
  const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

  const validCartItems = await cartItemModel
    .find({ userId, status: "Available" })
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ isSelected: -1, updatedAt: -1 });

  if (validCartItems.length === 0) {
    return res.status(200).json({
      message: "Your shopping cart is empty!",
      data: [],
    });
  }

  for (let cartItem of validCartItems) {
    const productId = cartItem.productId;
    const product = await productModel.findById(productId);

    if (!product) {
      cartItem.status = "Unavailable";
      await cartItem.save();
      continue;
    }

    if (product.status === "Discontinued" || product.status === "Coming Soon") {
      cartItem.status = "Unavailable";
    } else if (product.stock === 0 || product.status === "Sold Out") {
      cartItem.status = "Sold Out";
    } else {
      if (product.variantOptions.length > 0) {
        const matchedVariation = product.variations.find((v) =>
          v.variants.every(
            (variant, index) =>
              variant.name === cartItem.variants[index]?.name &&
              variant.value === cartItem.variants[index]?.value
          )
        );

        if (!matchedVariation) {
          cartItem.status = "Unavailable";
        } else {
          cartItem.name = product.name;
          cartItem.stock = matchedVariation.quantity;

          if (matchedVariation.quantity === 0) {
            cartItem.status = "Sold Out";
          }
        }
      } else {
        cartItem.name = product.name;
        cartItem.stock = product.stock;

        if (product.stock === 0) {
          cartItem.status = "Sold Out";
        }
      }
    }

    await cartItem.save();
  }

  const selectedCartItem = await cartItemModel.find({
    userId,
    isSelected: true,
  });
  const userCartDataDropdown = await cartItemModel
    .find({ userId, status: "Available" })
    .sort({ isSelected: -1, updatedAt: -1 })
    .limit(5);
  const inactiveCartItems = await cartItemModel
    .find({ userId, status: { $ne: "Available" } })
    .sort({ updatedAt: -1 });

  let selectedCount = selectedCartItem.length;
  let cartBillings = {
    subTotalAmount: 0,
    productDiscountAmount: 0,
    totalSavedAmount: 0,
    totalAmount: 0,
  };

  selectedCartItem.forEach((item) => {
    const itemSubtotal = item.comparePrice * item.quantity;
    const itemTotal = item.price * item.quantity;
    const itemSaved = (item.comparePrice - item.price) * item.quantity;
    cartBillings.subTotalAmount += itemSubtotal;
    cartBillings.totalAmount += itemTotal;
    cartBillings.productDiscountAmount += itemSaved;
  });
  cartBillings.totalSavedAmount = cartBillings.productDiscountAmount;

  return res.status(200).json({
    message: "Get user shopping cart successfully.",
    data: validCartItems,
    inactiveCartItems,
    cartBillings,
    userCartDataDropdown,
    totalItemCount,
    selectedCount,
    totalPage,
    page,
    itemsPerPage: limit,
  });
});
const updateCartItemById = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const cartItemId = req.params.cartItemId;

    if (!isValidObjectId(cartItemId)) {
      return createError(400, "Cart item ID is invalid!");
    }

    const { isSelected, quantity } = req.body;

    let existedCartItem = await cartItemModel.findById(cartItemId);
    if (!existedCartItem) {
      return createError(404, "Cart item not found!");
    }

    if (existedCartItem.userId.toString() !== userId.toString()) {
      return createError(400, "Invalid user!");
    }

    const existedProduct = await productModel.findById(
      existedCartItem.productId
    );
    if (!existedProduct || !existedProduct.isPublished) {
      return createError(400, "This product is not available!");
    }
    if (existedProduct.status === "Sold Out") {
      return createError(400, "This product is out of stock!");
    }
    if (existedProduct.status === "Discontinued") {
      return createError(400, "This product is discontinued.");
    }
    if (existedProduct.status === "Coming Soon") {
      return createError(400, "This product has not been released yet.");
    }
    // If update quantity
    if (isNotNull(quantity)) {
      if (!isNumber(quantity) || quantity <= 0) {
        return createError(400, "Quantity is invalid!");
      }

      // Check if the product has variations
      if (existedProduct.variantOptions.length > 0) {
        const matchedVariation = existedProduct.variations.find((v) =>
          v.variants.every(
            (variant, index) =>
              variant.name === existedCartItem.variants[index]?.name &&
              variant.value === existedCartItem.variants[index]?.value
          )
        );

        if (!matchedVariation) {
          return createError(400, "Selected variant is not available!");
        }

        if (matchedVariation.quantity < quantity) {
          return createError(400, "Not enough stock for this variant!");
        }

        existedCartItem.quantity = quantity;
        existedCartItem.stock = matchedVariation.quantity;
      } else {
        if (existedProduct.stock.stockQuantity < quantity) {
          return createError(400, "Insufficient stock for this product!");
        }

        existedCartItem.quantity = quantity;
        existedCartItem.stock = existedProduct.stock;
      }
    }
    if (isBoolean(isSelected)) {
      existedCartItem.isSelected = isSelected;
    }

    await existedCartItem.save();

    return res.status(200).json({
      message: "Cart Updated.",
      data: existedCartItem,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const handleSelectUserCartItem = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const { selectAll } = req.body;

    let userCartItems = await cartItemModel.find({ userId });
    if (isBoolean(selectAll)) {
      userCartItems.forEach((cartItem) => {
        cartItem.isSelected = selectAll;
      });

      await Promise.all(userCartItems.map((cartItem) => cartItem.save()));
    }

    return res.status(200).json({
      message: "Cart Updated.",
      data: userCartItems,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteCartItemByID = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;

    const cartItemId = req.params.cartItemId;
    if (!isValidObjectId(cartItemId)) {
      return createError(400, "Cart item ID is invalid!");
    }

    let existedCartItem = await cartItemModel.findById(cartItemId);
    if (!existedCartItem) {
      return createError(404, "Cart item not found!");
    }
    if (existedCartItem.userId.toString() !== userId.toString()) {
      return createError(400, "Invalid user!");
    }

    await cartItemModel.findByIdAndDelete(existedCartItem._id);

    return res.status(200).json({
      message: "Cart item deleted!",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteAllSelectedCartItems = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;

    const selectedCartItems = await cartItemModel.find({
      userId,
      isSelected: true,
    });

    if (selectedCartItems.length === 0) {
      return createError(400, "No cart items selected!");
    }

    await cartItemModel.deleteMany({
      userId,
      isSelected: true,
    });

    return res.status(200).json({
      message: `${selectedCartItems.length} cart items deleted`,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

module.exports = {
  createCartItem,
  getUserCartItem,
  updateCartItemById,
  deleteCartItemByID,
  handleSelectUserCartItem,
  deleteAllSelectedCartItems,
};
