const orderModel = require("../models/order.model");
const { getTodayDateGMT7 } = require("../utils/TimeFunctions");

module.exports = {
  updateOrderStatusProgress: async (statusProgress, stepIndex, stepStatus) => {
    const todayDateGMT7 = getTodayDateGMT7();
    const updatedStatusProgress = statusProgress.map((progress, index) => {
      if (index === stepIndex - 1) {
        return {
          ...progress,
          status: stepStatus,
          updatedAt:
            stepStatus === "Active" ? todayDateGMT7 : progress.updatedAt,
        };
      }
      return progress;
    });

    return updatedStatusProgress;
  },
};
