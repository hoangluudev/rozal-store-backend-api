module.exports = {
  getDiscountPercentage: (price, comparePrice) => {
    let gSaleRate = 0;
    if (price !== comparePrice) {
      gSaleRate = parseFloat(
        ((comparePrice - price) / comparePrice) * 100
      ).toFixed(0);
    }
    return gSaleRate;
  },
  convertToOptions: (label, value, arr) => {
    let arrList = arr;
    if (!Array.isArray(arr)) {
      arrList = [];
    }

    return arrList.map((item) => ({
      label: item[label],
      value: item[value],
    }));
  },
  getCategoryOptions: (label, value, arr) => {
    let arrList = arr;
    if (!Array.isArray(arr)) {
      arrList = [];
    }

    return arrList.map((item) => ({
      label: item[label],
      value: item[value],
      slug: item["slug"],
    }));
  },
  getProductTypeOptions: (label, value, arr) => {
    let arrList = Array.isArray(arr) ? [...arr] : [];

    arrList = arrList.map((item) => ({
      label: item[label],
      value: item[value],
      parent: item.categoryId ? item.categoryId.name : "N/A",
    }));

    return arrList;
  },
  getExpirationDate: (days) => {
    const currentDate = new Date();
    const expirationDate = new Date(
      currentDate.getTime() + days * 24 * 60 * 60 * 1000
    );
    return expirationDate;
  },
};
