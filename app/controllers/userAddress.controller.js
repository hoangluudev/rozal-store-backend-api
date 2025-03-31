const userAddressesModel = require("../models/userAddress.model");
const { createError } = require("../services/createError.service");
const {
  checkRequiredFields,
  isValidPhone,
  isValidObjectId,
  isNotNull,
} = require("../utils/HelperFunctions");

const createAddress = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;

    const userDeliveryAddresses = await userAddressesModel.find({ userId });
    if (userDeliveryAddresses.length > 10) {
      return createError(400, "You can only add up to 10 addresses!");
    }

    const { fullName, phone, city, district, ward, address, label, isDefault } =
      req.body;

    const requiredFields = [
      "fullName",
      "phone",
      "city",
      "district",
      "ward",
      "address",
    ];
    const missingRequiredFields = checkRequiredFields(req.body, requiredFields);
    if (missingRequiredFields) {
      return createError(400, missingRequiredFields);
    }
    if (!isValidPhone(phone)) {
      return createError(400, "Phone number is invalid!");
    }
    const newAddress = {
      userId: userId,
      fullName: fullName,
      phone: phone,
      city: city,
      district: district,
      ward: ward,
      address: address,
      label: label,
      isDefault: isDefault,
    };
    if (isDefault === true) {
      for (let address of userDeliveryAddresses) {
        address.isDefault = false;
        await address.save();
      }
    }
    const result = await userAddressesModel.create(newAddress);

    return res.status(201).json({
      message: "New address added successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const getUserAddresses = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;

    const result = await userAddressesModel
      .find({ userId })
      .sort({ isDefault: -1 });
    let userDefaultAddress = await userAddressesModel.findOne({
      userId,
      isDefault: true,
    });

    return res.status(200).json({
      message: "Get user address successfully.",
      data: result,
      userDefaultAddress,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const updateUserAddressById = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const addressId = req.params.addressId;

    if (!isValidObjectId(addressId)) {
      return createError(400, "Address ID is invalid!");
    }

    const { fullName, phone, city, district, ward, address, label, isDefault } =
      req.body;

    if (isNotNull(phone) && !isValidPhone(phone)) {
      return createError(400, "Phone number is invalid!");
    }

    let existedAddress = await userAddressesModel.findById(addressId);
    if (!existedAddress) {
      return createError(404, "Address not found!");
    }

    if (existedAddress.userId.toString() !== userId.toString()) {
      return createError(400, "Invalid user!");
    }
    if (existedAddress.isDefault === true && isDefault === false) {
      return createError(400, "Default address cannot be deselected.");
    }
    if (isNotNull(city) || isNotNull(district) || isNotNull(ward)) {
      if (isNotNull(city) && isNotNull(district) && isNotNull(ward)) {
        existedAddress.city = city;
        existedAddress.district = district;
        existedAddress.ward = ward;
      } else {
        return createError(400, "Missing required fields!");
      }
    }

    if (isNotNull(fullName)) existedAddress.fullName = fullName;
    if (isNotNull(phone)) existedAddress.phone = phone;

    if (isNotNull(address)) existedAddress.address = address;
    if (isNotNull(label)) existedAddress.label = label;
    if (isNotNull(isDefault)) existedAddress.isDefault = isDefault;

    if (isNotNull(isDefault) && isDefault === true) {
      await userAddressesModel.updateMany(
        { userId: userId, _id: { $ne: addressId } },
        { isDefault: false }
      );
    }

    await existedAddress.save();

    return res.status(200).json({
      message: "Address updated successfully.",
      data: existedAddress,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteUserAddressById = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;

    const addressId = req.params.addressId;
    if (!isValidObjectId(addressId)) {
      return createError(400, "Address ID is invalid!");
    }

    let existedAddress = await userAddressesModel.findById(addressId);
    if (!existedAddress) {
      return createError(404, "Address not found!");
    }
    if (existedAddress.userId.toString() !== userId.toString()) {
      return createError(400, "Invalid user!");
    }
    if (existedAddress.isDefault === true) {
      return createError(
        400,
        "This address is set as default and can't be removed."
      );
    }

    await userAddressesModel.findByIdAndDelete(existedAddress._id);

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

module.exports = {
  createAddress,
  getUserAddresses,
  updateUserAddressById,
  deleteUserAddressById,
};
