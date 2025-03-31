const express = require("express");
const route = express.Router();

const {
  signIn,
  signUp,
  signOut,
  getUserByAccessToken,
  refreshToken,
} = require("../controllers/auth.controller");

route.post("/signup", signUp);
route.post("/signin", signIn);
route.post("/logout", signOut);
route.post("/fetch-user", getUserByAccessToken);
route.post("/refresh-token", refreshToken);

module.exports = route;
