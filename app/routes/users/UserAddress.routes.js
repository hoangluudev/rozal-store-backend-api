const express = require("express");
const {
  createAddress,
  getUserAddresses,
  updateUserAddressById,
  deleteUserAddressById,
} = require("../../controllers/UserAddress.controller");

const router = express.Router();

router.post("/", createAddress);
router.get("/", getUserAddresses);
router.put("/id/:addressId", updateUserAddressById);
router.delete("/id/:addressId", deleteUserAddressById);

module.exports = router;
