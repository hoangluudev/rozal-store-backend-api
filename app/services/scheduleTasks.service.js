const OrderModel = require("../models/order.model");
const ProductModel = require("../models/productAlpha.model");
const ProductRatingModel = require("../models/ProductRating.model");
const { devConsLogger } = require("../utils/devLogger");
const { convertUTCtoStringGMT7 } = require("../utils/TimeFunctions");

module.exports = {
  cancelOrder: async (orderCode) => {
    const order = await OrderModel.findOne({ orderCode });
    if (order) {
      if (!["Unpaid"].includes(order.status)) {
        devConsLogger("Cannot cancel this job at this state!");
        return;
      }
      if (order.status === "Canceled") {
        devConsLogger("This order has already been cancelled!");
        return;
      }
      const cancellationDate = convertUTCtoStringGMT7(
        order.timestamps.paymentExpiredAt
      );
      order.timestamps.cancellationCompletedAt = cancellationDate;
      order.cancellationDetails = {
        initiatedBy: "System",
        reason: "Expired due to unpaid",
        approvalStatus: "Approved",
      };
      order.status = "Canceled";
      await order.save();
    }
  },
  updateProductRating: async () => {
    const products = await ProductModel.find({ status: "Selling" });

    for (const product of products) {
      const productId = product._id;

      const productRatings = await ProductRatingModel.find({ productId });

      if (productRatings.length === 0) {
        continue;
      }
      const totalScore = productRatings.reduce((sum, rating) => sum + rating.score, 0);
      const totalCount = productRatings.length;
      const averageScore = totalScore / totalCount;

      product.rate = {
        score: parseFloat(averageScore.toFixed(1)),
        count: totalCount,
      };

      await product.save();
    }
  },
  updateProductSale: async () => {
    const completedOrders = await OrderModel.find({ status: "Completed" });

    if (completedOrders.length === 0) {
      return;
    }

    const productSalesMap = new Map();

    for (const order of completedOrders) {
      for (const item of order.items) {
        const { productId, quantity } = item;

        if (!productId || !quantity) continue;

        productSalesMap.set(
          productId,
          (productSalesMap.get(productId) || 0) + quantity
        );
      }
    }

    for (const [productId, totalSales] of productSalesMap.entries()) {
      const product = await ProductModel.findById(productId);
      if (product) {
        product.sale = totalSales;
        await product.save();
      }
    }
  },
};
