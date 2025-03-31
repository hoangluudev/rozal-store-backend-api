const jwtToken = require("jsonwebtoken");
const db = require("../models");
const User = db.user;

const verifyUserAccessToken = async (accessToken) => {
  const secretKey = process.env.JWT_SECRET_KEY;

  try {
    if (
      !accessToken ||
      accessToken === "null" ||
      accessToken === "undefined" ||
      accessToken.trim() === ""
    ) {
      return {
        success: false,
        message: "Please log in to use this feature!",
      };
    }
    const verified = await jwtToken.verify(accessToken, secretKey);
    const user = await User.findById(verified.id);
    if (!user) {
      return {
        success: false,
        message: "This user account is not exists!",
      };
    }
    return {
      success: true,
      userId: verified.id,
    };
  } catch (error) {
    if (error instanceof jwtToken.TokenExpiredError) {
      return {
        success: false,
        message: "Session expired. Please refresh to continue!",
      };
    }
  }
};

module.exports = {
  verifyUserAccessToken,
};
