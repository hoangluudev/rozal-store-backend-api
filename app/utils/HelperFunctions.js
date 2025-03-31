const mongoose = require("mongoose");
module.exports = {
  filterItemsBySearchText: (arrayItems, property, searchText) => {
    const searchTextNormalized = searchText.replace(/\s+/g, "").toLowerCase();
    return arrayItems.filter((item) => {
      const itemPropertyNormalized = item[property]
        .replace(/\s+/g, "")
        .toLowerCase();
      return new RegExp(searchTextNormalized, "i").test(itemPropertyNormalized);
    });
  },
  validateLimit: (limit) => {
    const limits = [10, 20, 40, 50];
    if (!limits.includes(limit)) {
      return 10;
    }
    return limit;
  },
  validatePage: (page, totalPages) => {
    let newPage = page;
    if (page > totalPages) {
      newPage = totalPages > 1 ? totalPages : 1;
    }
    return newPage;
  },
  validateTableLimit: (limit) => {
    const limits = [5, 10, 20, 30, 50];
    if (!limits.includes(limit)) {
      return 10;
    }
    return limit;
  },
  validateTablePage: (page, totalPages) => {
    let newPage = page;
    if (page >= totalPages) {
      newPage = totalPages > 0 ? totalPages - 1 : 0;
    }
    return newPage;
  },
  isValidDate: (dateString) => {
    const regex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!regex.test(dateString)) return false;
    return dateString;
  },
  isValidEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  isValidPhone: (number) => {
    return /(((\+|)84)|0)(3|5|7|8|9)+([0-9]{8})\b/.test(number);
  },
  isFilterData: (...args) => {
    for (let arg of args) {
      if (arg !== undefined && arg !== null && arg !== "") {
        return true;
      }
    }
    return false;
  },
  convertArrayToOptions: (label, value, arr) => {
    let arrList = arr;
    if (!Array.isArray(arr)) {
      arrList = [];
    }
    return arrList.map((item) => ({
      label: item[label],
      value: item[value],
    }));
  },
  convertArrayStringToOptions: (arr) => {
    let arrList = arr;
    if (!Array.isArray(arr)) {
      arrList = [];
    }
    return arrList.map((item) => ({
      label: item.charAt(0).toUpperCase() + item.slice(1),
      value: item,
    }));
  },
  isArray: (arr) => {
    if (Array.isArray(arr)) {
      return true;
    }
    return false;
  },
  isNumber: (num) => {
    if (Number.isInteger(num)) {
      return true;
    }
    return false;
  },
  isValidObjectId: (objId) => {
    if (mongoose.Types.ObjectId.isValid(objId)) {
      return true;
    }
    return false;
  },
  isBoolean: (variable) => {
    return typeof variable === "boolean";
  },
  isNotNull: (value) => {
    return value !== null && value !== undefined;
  },
  isEmptyObj: (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  },
  checkRequiredFields: (body, requiredFields) => {
    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return `Missing required fields!`;
    }
    return null;
  },
  checkEmptyFields: (body, requiredFields) => {
    const emptyFields = requiredFields.filter((field) => {
      const value = body[field];
      if (value !== null) {
        if (typeof value === "string" && value.trim() === "") {
          return true;
        }
        if (Array.isArray(value) && value.length === 0) {
          return true;
        }
      }
      return false;
    });
    if (emptyFields.length > 0) {
      return `Field: ${
        `"` + emptyFields.join(", ") + `"`
      } should not be empty!`;
    }
    return null;
  },
  sendDeletionResponse: (res, successResult, totalResult, itemName) => {
    let successCount = successResult.length;
    let totalResultCount = totalResult.length;
    if (successCount === 0) {
      return res.status(500).json({
        status: "Bad Request",
        message: `Failed to delete ${totalResultCount} ${itemName}!`,
      });
    } else if (successCount > 0 && totalResultCount - successCount > 0) {
      return res.status(200).json({
        status: "Partial Success",
        message: `Successfully deleted ${successCount} ${itemName}, but failed to delete ${
          totalResultCount - successCount
        } ${itemName}.`,
      });
    }
    return res.status(200).json({
      message: `Successfully deleted ${successCount} ${itemName}.`,
    });
  },
};
