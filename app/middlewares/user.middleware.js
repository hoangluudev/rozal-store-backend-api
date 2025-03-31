const db = require("../models");
const User = db.user;
const {
  verifyUserAccessToken,
} = require("../services/verifyUserToken.service");
const { tryCatch } = require("../utils/tryCatch");
const { createError } = require("../services/createError.service");

const verifyToken = tryCatch(async (req, res, next) => {
  let accessToken = req.headers["x-access-token"];

  const verifiedToken = await verifyUserAccessToken(accessToken);
  if (!verifiedToken.success) {
    return createError(401, verifiedToken.message);
  }

  const user = await User.findById(verifiedToken.userId).populate("role");

  req.user = user;
  next();
});
const checkIsAdmin = tryCatch(async (req, res, next) => {
  const userRoles = req.user.role;
  const checkRoleName = (roleObj) => roleObj.name === "admin";
  if (!checkRoleName(userRoles)) {
    return createError(401, "Access denied!");
  }
  next();
});

module.exports = {
  verifyToken,
  checkIsAdmin,
};
