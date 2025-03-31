const db = require("../models");
const bcrypt = require("bcrypt");
const statusType = {
  invalid: "invalid",
  error: "error",
};
const User = db.user;
const {
  createAccessToken,
  createRefreshToken,
} = require("../services/createToken.service");
const {
  verifyUserAccessToken,
} = require("../services/verifyUserToken.service");

const signUp = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Missing required fields!",
      });
    }
    if (username.length < 8) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Username must be at least 8 characters!",
      });
    }
    if (username.includes(" ")) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Username cannot contain white spaces!",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Email is invalid!",
      });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,30}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Password is invalid!",
      });
    }
    if (confirmPassword !== password) {
      return res.status(400).json({
        statusType: statusType.invalid,
        message: "Confirm password not match!",
      });
    }
    const existedAccount = await db.user.findOne({
      $or: [{ email }, { username }],
    });

    if (existedAccount) {
      return res.status(422).json({
        message: "Account username or email existed!",
      });
    }
    let role = "user";
    const userRole = await db.role.findOne({ name: role });

    if (!userRole) {
      return res.status(400).json({
        message: "Role invalid!",
      });
    }

    await new db.user({
      username: username,
      email: email,
      role: userRole._id,
      password: bcrypt.hashSync(password, 8),
    }).save();

    return res.status(200).json({
      message: "Sign up successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }
    const isEmail = /\S+@\S+\.\S+/;
    const isInputEmail = isEmail.test(username);

    let userQuery;
    if (isInputEmail) {
      userQuery = { email: username };
    } else {
      userQuery = { username };
    }

    const existedAccount = await db.user.findOne(userQuery);
    if (!existedAccount) {
      return res.status(404).json({
        message: "Account not exist!",
      });
    }

    var passwordIsValid = bcrypt.compareSync(password, existedAccount.password);
    if (!passwordIsValid) {
      return res.status(401).json({
        message: "Incorrect username or password!",
      });
    }

    const accessToken = await createAccessToken(existedAccount);
    const refreshToken = await createRefreshToken(existedAccount);

    const appDomain = process.env.REACT_APP_URL;
    const cookieAge =
      parseInt(process.env.JWT_REFRESH_EXPIRATION) + 7 * 24 * 60 * 60 * 1000;

    res.cookie("sessionid", refreshToken, {
      httpOnly: true,
      secure: false,
      maxAge: cookieAge,
      domain: new URL(appDomain).hostname,
    });

    let accessTokenExpiresTime =
      new Date().getTime() + parseInt(process.env.JWT_EXPIRES_TIME);

    return res.status(200).json({
      message: "Login success",
      accessToken: accessToken,
      sessionid_exp: accessTokenExpiresTime,
      refreshToken: refreshToken,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
const signOut = async (req, res) => {
  try {
    const refreshToken = req.cookies.sessionid;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token not found!" });
    }

    const currentLoggingOutUser = await db.refreshToken.findOne({
      token: refreshToken,
    });

    if (!currentLoggingOutUser) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
    const userId = currentLoggingOutUser.user;

    const result = await db.refreshToken.deleteOne({ token: refreshToken });

    if (result.deletedCount === 0) {
      return res.status(400).json({ message: "Logout failed" });
    }
    const currentTime = new Date();
    await db.refreshToken.deleteMany({
      user: userId,
      expiredDate: { $lte: currentTime },
    });

    res.clearCookie("sessionid");

    return res.status(200).json({ message: "You are now logged out" });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.sessionid;
    const currentSessionRefreshToken = await db.refreshToken.findOne({
      token: refreshToken,
    });

    if (!currentSessionRefreshToken) {
      return res.status(400).json({ message: "Refresh token not found!" });
    }

    const expiredDate = currentSessionRefreshToken.expiredDate;
    const currentTime = new Date();

    if (expiredDate.getTime() < currentTime.getTime()) {
      await db.refreshToken.findByIdAndDelete(currentSessionRefreshToken._id);
      res.clearCookie("sessionid");
      return res
        .status(403)
        .json({ message: "Login session expired! Please login again" });
    }
    const newAccessToken = await createAccessToken(
      currentSessionRefreshToken.user
    );
    let accessTokenExpiresTime =
      new Date().getTime() + parseInt(process.env.JWT_EXPIRES_TIME);

    return res.status(200).json({
      message: "Session refreshed successfully",
      accessToken: newAccessToken,
      sessionid_exp: accessTokenExpiresTime,
      refreshToken: currentSessionRefreshToken.token,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};

const getUserByAccessToken = async (req, res) => {
  try {
    const { accessToken: token } = req.body;
    const verifiedToken = await verifyUserAccessToken(token);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }

    const user = await User.findById(verifiedToken.userId).populate("role");

    return res.status(200).json({
      message: "Get User Successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};

module.exports = {
  signIn,
  signUp,
  signOut,
  refreshToken,
  getUserByAccessToken,
};
