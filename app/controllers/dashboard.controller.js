const db = require("../models");
const User = db.user;
const Role = db.role;
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");

function getStartOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}
function getEndOfToday() {
  const today = new Date();
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );
}
function getStartOfDay(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}
function getEndOfDay(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}
function getLastNDays(n) {
  const result = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    result.push(date);
  }
  return result;
}
function getStartOfWeek() {
  const today = new Date();
  const firstDayOfWeek = today.getDate() - today.getDay();
  const startOfWeek = new Date(today.setDate(firstDayOfWeek));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}
function getEndOfWeek() {
  const today = new Date();
  const lastDayOfWeek = today.getDate() - today.getDay() + 6;
  const endOfWeek = new Date(today.setDate(lastDayOfWeek));
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}
function getStartOfMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}
function getEndOfMonth() {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    lastDayOfMonth.getDate(),
    23,
    59,
    59,
    999
  );
}
function getStartOfYear() {
  const today = new Date();
  return new Date(today.getFullYear(), 0, 1);
}
function getEndOfYear() {
  const today = new Date();
  return new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
}
function getLastNMonths(n) {
  const result = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() - i,
      1,
      0,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999
    );
    result.push({ startOfMonth, endOfMonth });
  }
  return result;
}

const startOfToday = getStartOfToday();
const endOfToday = getEndOfToday();
const startOfWeek = getStartOfWeek();
const endOfWeek = getEndOfWeek();
const startOfMonth = getStartOfMonth();
const endOfMonth = getEndOfMonth();
const startOfYear = getStartOfYear();
const endOfYear = getEndOfYear();

const getTotalRevenue = async (startDate = null, endDate = null) => {
  const matchConditions = { status: "completed" };
  if (startDate && endDate) {
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  }
  const result = await orderModel.aggregate([
    { $match: matchConditions },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};
const getTotalSales = async (startDate = null, endDate = null) => {
  const matchConditions = { status: "completed" };
  if (startDate && endDate) {
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  }
  const orders = await orderModel.find(matchConditions);
  let totalSales = 0;
  orders.forEach((order) => {
    order.items.forEach((item) => {
      totalSales += item.price * item.quantity;
    });
  });
  return totalSales;
};
const getTotalProductSold = async (startDate = null, endDate = null) => {
  const matchConditions = { status: "completed" };
  if (startDate && endDate) {
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  }
  const orders = await orderModel.find(matchConditions);
  let totalProductSold = 0;
  orders.forEach((order) => {
    order.items.forEach((item) => {
      totalProductSold += item.quantity;
    });
  });
  return totalProductSold;
};
const getWeeklyStats = async () => {
  let gTotalSale = await orderModel.aggregate([
    {
      $match: { status: "completed" },
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: {
          $sum: { $multiply: ["$items.price", "$items.quantity"] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  let gWeeklyStats = await orderModel.aggregate([
    {
      $match: { status: "completed" },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        _id: 1,
        totalRevenue: 1,
        totalOrders: { $size: "$totalOrders" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  let combinedStats = {};
  gTotalSale.forEach((item) => {
    combinedStats[item._id] = {
      _id: item._id,
      totalSales: item.totalSales,
    };
  });
  gWeeklyStats.forEach((item) => {
    if (!combinedStats[item._id]) {
      combinedStats[item._id] = {
        _id: item._id,
        totalRevenue: item.totalRevenue,
        totalOrders: item.totalOrders,
      };
    } else {
      combinedStats[item._id].totalRevenue = item.totalRevenue;
      combinedStats[item._id].totalOrders = item.totalOrders;
    }
  });

  let result = Object.values(combinedStats);
  return result;
};
const getTotalProductsEachCategory = async () => {
  try {
    const result = await productModel.aggregate([
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
        },
      },
    ]);
    const categoryProductCount = result.map((category) => ({
      label: category._id,
      value: category.totalProducts,
    }));

    return categoryProductCount;
  } catch (error) {
    throw new Error("Failed to fetch product categories");
  }
};
const findTopSoldProducts = async (startDate, endDate) => {
  let limit = 5;
  const matchConditions = { status: "completed" };
  if (startDate && endDate) {
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  }

  const topSoldProducts = await orderModel.aggregate([
    { $match: matchConditions },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        productName: { $first: "$items.name" },
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ]);

  return topSoldProducts;
};
const convertTopSoldProductToDataset = async (arrObj) => {
  const names = [];
  const quantities = [];
  arrObj.forEach((category) => {
    names.push(category.productName);
    quantities.push(category.totalQuantity);
  });
  return {
    name: names,
    quantity: quantities,
  };
};

const getDashboardStatistics = async (req, res) => {
  try {
    const targetStatus = ["pending", "completed", "canceled"];

    // Total Order Count
    const totalOrderCountToday = await orderModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const totalOrderCountThisMonth = await orderModel.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const totalOrderCountThisYear = await orderModel.countDocuments({
      createdAt: { $gte: startOfYear, $lte: endOfYear },
    });
    const totalOrderCountAll = await orderModel.countDocuments();
    // Order Status Count By Time
    const initialOrderStatusCount = Object.fromEntries(
      targetStatus.map((status) => [status, 0])
    );
    // Today
    const findOrderStatusCountToday = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatusCountToday = { ...initialOrderStatusCount };
    findOrderStatusCountToday.forEach(({ _id, count }) => {
      orderStatusCountToday[_id] = count;
    });
    // This month
    const findOrderStatusCountThisMonth = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatusCountThisMonth = { ...initialOrderStatusCount };
    findOrderStatusCountThisMonth.forEach(({ _id, count }) => {
      orderStatusCountThisMonth[_id] = count;
    });
    // This year
    const findOrderStatusCountThisYear = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatusCountThisYear = { ...initialOrderStatusCount };
    findOrderStatusCountThisYear.forEach(({ _id, count }) => {
      orderStatusCountThisYear[_id] = count;
    });
    // All Time
    const findOrderStatusCountAll = await orderModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatusCountAll = { ...initialOrderStatusCount };
    findOrderStatusCountAll.forEach(({ _id, count }) => {
      orderStatusCountAll[_id] = count;
    });

    // Total Revenue By Time
    const totalRevenueAllTime = await getTotalRevenue();
    const totalRevenueToday = await getTotalRevenue(startOfToday, endOfToday);
    const totalRevenueThisWeek = await getTotalRevenue(startOfWeek, endOfWeek);
    const totalRevenueThisMonth = await getTotalRevenue(
      startOfMonth,
      endOfMonth
    );
    const totalRevenueThisYear = await getTotalRevenue(startOfYear, endOfYear);
    // Total Sales By Time
    const totalSalesAllTime = await getTotalSales();
    const totalSalesToday = await getTotalSales(startOfToday, endOfToday);
    const totalSalesThisWeek = await getTotalSales(startOfWeek, endOfWeek);
    const totalSalesThisMonth = await getTotalSales(startOfMonth, endOfMonth);
    const totalSalesThisYear = await getTotalSales(startOfYear, endOfYear);

    // Get monthly statistics for the last 12 months
    const last12Months = getLastNMonths(12);
    const getMonthlyStats = await Promise.all(
      last12Months.map(async ({ startOfMonth, endOfMonth }) => {
        const totalRevenue = await getTotalRevenue(startOfMonth, endOfMonth);
        const totalSales = await getTotalSales(startOfMonth, endOfMonth);
        const totalOrders = await orderModel.countDocuments({
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: "completed",
        });
        if (totalOrders > 0) {
          return {
            _id: `${startOfMonth.getFullYear()}-${startOfMonth.getMonth() + 1}`,
            totalRevenue,
            totalSales,
            totalOrders,
          };
        } else {
          return null;
        }
      })
    );
    const gMonthlyStats = getMonthlyStats
      .filter((stat) => stat !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Total clients
    const userRole = await Role.findOne({ name: "user" });
    const totalUsers = await User.countDocuments({ role: userRole._id });
    // Total product sold
    const totalProductSold = await getTotalProductSold();
    // Total product each category
    const totalProductCategory = await getTotalProductsEachCategory();

    const gWeeklyStatistic = await getWeeklyStats();

    const weeklyStats = {
      label: gWeeklyStatistic.map((week) => week._id),
      totalOrders: gWeeklyStatistic.map((week) => week.totalOrders),
      totalRevenues: gWeeklyStatistic.map((week) => week.totalRevenue),
      totalSales: gWeeklyStatistic.map((week) => week.totalSales),
    };
    const monthlyStats = {
      label: gMonthlyStats.map((week) => week._id),
      totalOrders: gMonthlyStats.map((week) => week.totalOrders),
      totalRevenues: gMonthlyStats.map((week) => week.totalRevenue),
      totalSales: gMonthlyStats.map((week) => week.totalSales),
    };
    const gTotalProductEachCategory = {
      label: totalProductCategory.map((category) => category.label),
      totalProducts: totalProductCategory.map((category) => category.value),
    };

    // Get Best sold products
    const gMostSoldProductToday = await findTopSoldProducts(
      startOfToday,
      endOfToday
    );
    const gMostSoldProductThisMonth = await findTopSoldProducts(
      startOfMonth,
      endOfMonth
    );
    const gMostSoldProductThisYear = await findTopSoldProducts(
      startOfYear,
      endOfYear
    );
    const gMostSoldProductAllTime = await findTopSoldProducts();
    // Convert Best sold products to array obj
    const topProductSoldToday = await convertTopSoldProductToDataset(
      gMostSoldProductToday
    );
    const topProductSoldThisMonth = await convertTopSoldProductToDataset(
      gMostSoldProductThisMonth
    );
    const topProductSoldThisYear = await convertTopSoldProductToDataset(
      gMostSoldProductThisYear
    );
    const topProductSoldTAllTime = await convertTopSoldProductToDataset(
      gMostSoldProductAllTime
    );

    const response = {
      status: "Get order statistic successfully!",
      totalRevenue: {
        _allTime: totalRevenueAllTime || 0,
        _today: totalRevenueToday || 0,
        _thisWeek: totalRevenueThisWeek || 0,
        _thisMonth: totalRevenueThisMonth || 0,
        _thisYear: totalRevenueThisYear || 0,
      },
      totalSales: {
        _allTime: totalSalesAllTime || 0,
        _today: totalSalesToday || 0,
        _thisWeek: totalSalesThisWeek || 0,
        _thisMonth: totalSalesThisMonth || 0,
        _thisYear: totalSalesThisYear || 0,
      },
      orderStatusCountBy: {
        _today: { ...orderStatusCountToday, all: totalOrderCountToday },
        _thisMonth: {
          ...orderStatusCountThisMonth,
          all: totalOrderCountThisMonth,
        },
        _thisYear: {
          ...orderStatusCountThisYear,
          all: totalOrderCountThisYear,
        },
        _allTime: { ...orderStatusCountAll, all: totalOrderCountAll },
      },
      overrallStatsBy: {
        _weekly: weeklyStats,
        _monthly: monthlyStats,
      },
      topSoldProducts: {
        _today: topProductSoldToday,
        _thisMonth: topProductSoldThisMonth,
        _thisYear: topProductSoldThisYear,
        _allTime: topProductSoldTAllTime,
      },
      totalClientCount: totalUsers,
      totalProductSold: totalProductSold,
      totalProductEachCategory: gTotalProductEachCategory,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};

module.exports = { getDashboardStatistics };
