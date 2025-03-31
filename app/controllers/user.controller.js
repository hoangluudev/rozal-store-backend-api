const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const db = require("../models");
const jwtToken = require("jsonwebtoken");
const User = db.user;
const Role = db.role;
const orderModel = require("../models/order.model");
const {
  verifyUserAccessToken,
} = require("../services/verifyUserToken.service");
const {
  isValidDate,
  isValidEmail,
  isValidPhone,
  checkRequiredFields,
} = require("../utils/HelperFunctions");

const getAllClients = async (req, res) => {
  try {
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      return res.status(404).json({
        status: "Role not found",
      });
    }

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

    const users = await User.find({ role: userRole._id })
      .populate("role")
      .skip(startIndex)
      .limit(limit);

    const totalUsers = await User.countDocuments({ role: userRole._id });

    const response = {
      status: "Get Clients Successfully!",
      currentPage: page,
      limit: limit,
      totalItems: totalUsers,
      data: users,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllClientsWithSearch = async (req, res) => {
  try {
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      return res.status(404).json({
        status: "Role not found",
      });
    }

    const { searchText, page = 0, limit = 10 } = req.query;
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

    const startIndex = parseInt(page, 10) * parseInt(limit, 10);

    const filter = {
      role: userRole._id,
      $or: [
        { fullName: new RegExp(searchTextLower, "i") },
        { email: new RegExp(searchTextLower, "i") },
        { phone: new RegExp(searchTextLower, "i") },
        { username: new RegExp(searchTextLower, "i") },
      ],
    };

    const users = await User.find(filter)
      .populate("role")
      .skip(startIndex)
      .limit(parseInt(limit, 10));

    const totalUsers = await User.countDocuments(filter);

    const response = {
      status: "Get Searched Clients Successfully!",
      isSearching: searchTextLower === "" ? false : true,
      currentPage: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalItems: totalUsers,
      data: users,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getAllClientsWithFilter = async (req, res) => {
  try {
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      return res.status(404).json({
        status: "Role not found",
      });
    }

    let { gender, joinDate, page = 0, limit = 10 } = req.query;
    if (isNaN(page) || page < 0 || isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        status: "Invalid page number or limit value",
      });
    }

    const startIndex = parseInt(page, 10) * parseInt(limit, 10);

    let filter = { role: userRole._id };

    if (gender) filter.gender = gender;

    if (joinDate) {
      const [startDateStr, endDateStr] = joinDate.split(",");
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const users = await User.find(filter)
      .populate("role")
      .skip(startIndex)
      .limit(parseInt(limit, 10));

    const totalUsers = await User.countDocuments(filter);

    const response = {
      status: "Filtered Clients Successfully!",
      data: users,
      currentPage: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalItems: totalUsers,
      isFilterApplied: gender || joinDate ? true : false,
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

const getAllStaffMembers = async (req, res) => {
  try {
    const adminRole = await Role.findOne({ name: "admin" });
    const moderatorRole = await Role.findOne({ name: "moderator" });

    if (!adminRole || !moderatorRole) {
      return res.status(404).json({
        status: "Roles not found",
      });
    }

    const users = await User.find({
      role: { $in: [adminRole._id, moderatorRole._id] },
    });
    return res.status(200).json({
      status: "Get Staffs Successfully!",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const getUserByID = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "User ID is not valid",
      });
    }

    const result = await User.findById(userId);

    if (result) {
      return res.status(200).json({
        status: "Get User Successfully!",
        data: result,
      });
    } else {
      return res.status(404).json({
        status: "User not found!",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      profileImage,
      phone,
      gender,
      birthDate,
      username,
      password,
    } = req.body;
    if (!fullName || !email || !phone || !username || !password) {
      return res.status(400).json({
        status: "Bad request!",
        message: "Missing required fields",
      });
    }
    if (username.length < 8) {
      return res.status(400).json({
        status: "Bad request!",
        message: "Username must be at least 8 characters!",
      });
    }
    if (username.includes(" ")) {
      return res.status(400).json({
        status: "Bad request!",
        message: "Username cannot contain white spaces!",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: "Bad request!",
        message: "Email is not valid!",
      });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: "Bad request!",
        message: "Password is invalid!",
      });
    }
    const existedAccount = await db.user.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (existedAccount) {
      return res.status(422).json({
        message: "Username or email already exists!",
      });
    }

    let role = "user";
    let userRole = await db.role.findOne({ name: role });
    if (!userRole) {
      userRole = await new db.role({ name: role }).save();
    }

    const newUser = await new db.user({
      fullName: fullName,
      email: email,
      profileImage: profileImage,
      phone: phone,
      gender: gender,
      birthDate: birthDate,
      username: username,
      role: userRole._id,
      password: bcrypt.hashSync(password, 8),
    }).save();

    return res.status(200).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const updateUserInformation = async (req, res) => {
  try {
    let accessToken = req.headers["x-access-token"];
    const verifiedToken = await verifyUserAccessToken(accessToken);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }
    const user = await User.findById(verifiedToken.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const { fullName, email, profileImage, phone, gender, birthDate } =
      req.body;

    if (birthDate && !isValidDate(birthDate)) {
      return res.status(400).json({
        message: "Birthdate is invalid!",
      });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        message: "email is invalid!",
      });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        message: "phone is invalid!",
      });
    }

    const updateFields = (field, value) => {
      if (value !== undefined && value !== null && value !== "") {
        user[field] = value;
      }
    };

    updateFields("fullName", fullName);
    updateFields("email", email);
    updateFields("profileImage", profileImage);
    updateFields("phone", phone);
    updateFields("gender", gender);
    updateFields("birthDate", birthDate);

    await user.save();

    return res.status(200).json({
      message: "User information updated!",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error!",
    });
  }
};
const updateUserById = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { fullName, email, profileImage, phone, gender } = req.body;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        message: "Email is invalid!",
      });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        message: "Phone is invalid!",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const updateFields = (field, value) => {
      if (value !== undefined && value !== null && value !== "") {
        user[field] = value;
      }
    };

    updateFields("fullName", fullName);
    updateFields("email", email);
    updateFields("profileImage", profileImage);
    updateFields("phone", phone);
    updateFields("gender", gender);

    await user.save();

    return res.status(200).json({
      message: "Update user successfully!",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error!",
    });
  }
};

const deleteUserByID = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "Bad Request",
        message: "User ID is not valid",
      });
    }

    const result = await User.findByIdAndDelete(userId);

    if (result) {
      return res.status(204).json({
        status: "Delete User Successfully!",
        data: result,
      });
    } else {
      return res.status(404).json({
        status: "User not found!",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};
const deleteMultipleUserByID = async (req, res) => {
  try {
    const { userIdList } = req.body;
    if (!Array.isArray(userIdList) || userIdList.length === 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: "User IDs should be a non-empty array",
      });
    }

    const invalidIds = userIdList.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return res.status(400).json({
        status: "Bad Request",
        message: `Invalid User IDs: ${invalidIds.join(", ")}`,
      });
    }

    const deleteResult = await Promise.all(
      userIdList.map(async (userId) => {
        const result = await User.findByIdAndDelete(userId);
        return result
          ? { userId, status: "Delete Success" }
          : { userId, status: "Not found" };
      })
    );

    return res.status(200).json({
      status: "Completed",
      message: "Delete multiple user completed",
      result: deleteResult,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal server error",
      message: error.message,
    });
  }
};

const getUserOrderHistory = async (req, res) => {
  try {
    let accessToken = req.headers["x-access-token"];
    if (!accessToken) {
      return res.status(401).send({
        message: "x-access-token is not found!",
      });
    }
    const secretKey = process.env.JWT_SECRET_KEY;

    const verified = await jwtToken.verify(accessToken, secretKey);
    if (!verified) {
      return res.status(401).send({
        message: "x-access-token is invalid!",
      });
    }

    let user = await User.findById(verified.id);
    const userId = user._id;

    const orderHistory = await orderModel.find({ customerID: userId });
    return res.status(200).send({
      message: "Get Order history successfully",
      data: orderHistory,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllClients,
  getAllClientsWithSearch,
  getAllClientsWithFilter,
  getAllStaffMembers,
  getUserOrderHistory,
  getUserByID,
  createUser,
  updateUserInformation,
  updateUserById,
  deleteUserByID,
  deleteMultipleUserByID,
};
