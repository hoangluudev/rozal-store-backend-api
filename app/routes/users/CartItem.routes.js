const express = require("express");
const {
  createCartItem,
  getUserCartItem,
  updateCartItemById,
  deleteCartItemByID,
  handleSelectUserCartItem,
  deleteAllSelectedCartItems,
} = require("../../controllers/UserCartItem.controller");

const router = express.Router();

router.post("/", createCartItem);
router.get("/", getUserCartItem);
router.put("/id/:cartItemId", updateCartItemById);
router.patch("/", handleSelectUserCartItem);
router.delete("/id/:cartItemId", deleteCartItemByID);
router.delete("/bulk/delete", deleteAllSelectedCartItems);

module.exports = router;
