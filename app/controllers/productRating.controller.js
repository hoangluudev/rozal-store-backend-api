const ProductModel = require("../models/productAlpha.model");
const OrderModel = require("../models/order.model");
const ProductRatingModel = require("../models/ProductRating.model");
const {
  checkRequiredFields,
  isNotNull,
  isBoolean,
  isArray,
} = require("../utils/HelperFunctions");
const { createError } = require("../services/createError.service");
const { tryCatch } = require("../utils/tryCatch");
const { updateImageUsageStatus } = require("../services/uploadImage.service");

const createProductRating = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const productCode = req.params.productCode;

  if (!productCode) {
    return createError(400, "Product code is required!");
  }

  const product = await ProductModel.findOne({ productCode });
  if (!product) {
    return createError(404, "Product not found!");
  }

  const existedRating = await ProductRatingModel.findOne({
    userId,
    productId: product._id,
  });
  if (existedRating) {
    return createError(409, "You have already rated this product!");
  }

  const { orderCode, content, images, score, isAnonymous } = req.body;
  const missingFields = checkRequiredFields(req.body, ["orderCode", "score"]);
  if (missingFields) {
    return createError(400, missingFields);
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return createError(400, "Score must be an integer between 1 and 5!");
  }

  const order = await OrderModel.findOne({ orderCode });
  if (!order) {
    return createError(404, "Order not found!");
  }

  const productInOrder = order.items.some(
    (item) => item.productCode === productCode
  );
  if (!productInOrder) {
    return createError(400, "This product is not exist in your order!");
  }

  if (order.status !== "Completed") {
    return createError(
      409,
      "You can only rate products from completed orders!"
    );
  }
  if (Array.isArray(images) && images.length > 0) {
    if (images.length > 5) {
      return createError(400, "You can upload up to 5 images only!");
    }
    for (let image of images) {
      await updateImageUsageStatus(image, true);
    }
  }

  const editDeadline = new Date();
  editDeadline.setDate(editDeadline.getDate() + 30);

  const newRating = await ProductRatingModel.create({
    userId,
    productId: product._id,
    content: content || "",
    images: images || [],
    score,
    isAnonymous: isAnonymous || false,
    editAllowedUntil: editDeadline,
  });

  return res.status(201).json({
    message: "Thank you for your feedback!",
    data: newRating,
  });
});
const updateProductRating = tryCatch(async (req, res) => {
  const userId = req.user._id;
  const productCode = req.params.productCode;

  if (!productCode) {
    return createError(400, "Product code is required!");
  }

  const product = await ProductModel.findOne({ productCode });
  if (!product) {
    return createError(404, "Product not found!");
  }

  const existingRating = await ProductRatingModel.findOne({
    userId,
    productId: product._id,
  });

  if (!existingRating) {
    return createError(404, "You have not rated this product yet!");
  }

  const now = new Date();
  if (now > existingRating.editAllowedUntil) {
    return createError(403, "Edit period for this rating has expired!");
  }

  const { content, images, score, isAnonymous } = req.body;

  if (score && (!Number.isInteger(score) || score < 1 || score > 5)) {
    return createError(400, "Score must be an integer between 1 and 5!");
  }

  if (Array.isArray(images) && images.length > 0) {
    if (images.length > 5) {
      return createError(400, "You can upload up to 5 images only!");
    }
    for (let image of images) {
      await updateImageUsageStatus(image, true);
    }
  }

  if (isNotNull(content)) existingRating.content = content;
  if (isArray(images)) existingRating.images = images;
  if (isNotNull(score)) existingRating.score = score;
  if (isBoolean(isAnonymous)) existingRating.isAnonymous = isAnonymous;

  await existingRating.save();

  return res.status(200).json({
    message: "Your rating has been updated!",
    data: existingRating,
  });
});
const voteProductRating = tryCatch(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await ProductRatingModel.findById(reviewId);
  if (!review) {
    return createError(404, "Review not found!");
  }

  const userIndex = review.helpfulVote.byUsers.findIndex(
    (id) => id.toString() === userId.toString()
  );

  if (userIndex > -1) {
    review.helpfulVote.byUsers.splice(userIndex, 1);
    review.helpfulVote.count -= 1;
  } else {
    review.helpfulVote.byUsers.push(userId);
    review.helpfulVote.count += 1;
  }

  await review.save();

  return res.status(200).json({
    message: "Helpful vote updated!",
  });
});
const deleteProductRating = tryCatch(async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { productId } = req.params;

  // Kiểm tra xem đánh giá có tồn tại không
  const rating = await ProductRatingModel.findOne({ userId, productId });
  if (!rating) {
    return createError(404, "Rating not found!");
  }

  // Kiểm tra nếu có trong activeOrders, phải có đơn hàng đã giao
  const activeOrderIds = rating.activeOrders;
  const order = await OrderModel.findOne({
    _id: { $in: activeOrderIds },
    status: "Completed",
  });

  if (!order) {
    return createError(
      400,
      "You can only delete your review if your order is successfully delivered."
    );
  }

  // Xóa đánh giá
  await ProductRatingModel.deleteOne({ userId, productId });

  return res.status(200).json({
    message: "Your review has been deleted successfully!",
  });
});

module.exports = {
  createProductRating,
  updateProductRating,
  voteProductRating,
  deleteProductRating,
};
