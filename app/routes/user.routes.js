const express = require("express");

const route = express.Router();

const { verifyToken, checkIsAdmin } = require("../middlewares/user.middleware");
const {
  getAllClients,
  getAllClientsWithSearch,
  getAllClientsWithFilter,
  getAllStaffMembers,
  getUserOrderHistory,
  updateUserById,
  createUser,
  getUserByID,
  updateUserInformation,
  deleteUserByID,
  deleteMultipleUserByID,
} = require("../controllers/user.controller");

route.get("/order-history", getUserOrderHistory);
route.patch("/update-info", verifyToken, updateUserInformation);

route.post("/new-client", [verifyToken, checkIsAdmin], createUser);
route.get("/clients", [verifyToken, checkIsAdmin], getAllClients);
route.get(
  "/search-client",
  [verifyToken, checkIsAdmin],
  getAllClientsWithSearch
);
route.get(
  "/filter-client",
  [verifyToken, checkIsAdmin],
  getAllClientsWithFilter
);
route.get("/staffs", [verifyToken, checkIsAdmin], getAllStaffMembers);
route.get("/:userId", [verifyToken, checkIsAdmin], getUserByID);
route.put("/:userId", [verifyToken, checkIsAdmin], updateUserById);
route.delete(
  "/delete-user/:userId",
  [verifyToken, checkIsAdmin],
  deleteUserByID
);
route.delete(
  "/delete-multiple-user",
  [verifyToken, checkIsAdmin],
  deleteMultipleUserByID
);

module.exports = route;
