const db = require("../models");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const createAccessToken = async (user) => {
  const secretKey = process.env.JWT_SECRET_KEY;
  const expiresTime = process.env.JWT_EXPIRES_TIME;

  const accessToken = jwt.sign(
    {
      id: user._id,
    },
    secretKey,
    {
      expiresIn: expiresTime,
    }
  );

  return accessToken;
};

const createRefreshToken = async (user) => {
  let newExpiredTime = new Date().getTime();

  let expiredAt = newExpiredTime + parseInt(process.env.JWT_REFRESH_EXPIRATION);
  let token = uuidv4();

  let refreshTokenObj = new db.refreshToken({
    token: token,
    user: user._id,
    expiredDate: expiredAt,
  });
  const refreshToken = await refreshTokenObj.save();  
  return refreshToken.token;
};

module.exports = { createAccessToken, createRefreshToken };
