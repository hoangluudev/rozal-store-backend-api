const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const db = require("../models");
const User = db.user;
const otpModel = require("../models/emailOTP.model");
const { sendOTPEmailService } = require("../services/sendOTPEmail.service");
const otpGenerator = require("otp-generator");
const {
  verifyUserAccessToken,
} = require("../services/verifyUserToken.service");

const sendOTPEmail = async (req, res) => {
  try {
    let accessToken = req.headers["x-access-token"];
    const verifiedToken = await verifyUserAccessToken(accessToken);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }
    const user = await User.findById(verifiedToken.userId);

    const userEmail = user.email;
    const oldUserPassword = user.password;

    const { newPassword, confirmPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Password is required!",
      });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,30}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password is invalid!",
      });
    }
    if (confirmPassword !== newPassword) {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Confirm password not matched!",
      });
    }
    const isPasswordMatch = await bcrypt.compareSync(
      newPassword,
      oldUserPassword
    );
    if (isPasswordMatch) {
      return res.status(400).json({
        message: "New password must be different from the old password!",
      });
    }

    const subjectContent = "Change Password Verification";
    const newOTPCode = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const otpOptions = {
      email: userEmail,
      subjectContent: subjectContent,
      otpCode: newOTPCode,
    };
    const expiredAt = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRES_TIME)
    );
    const response = await sendOTPEmailService(otpOptions);

    if (!response.success) {
      return res.status(500).json({
        message: "Failed to send email! Please try again later.",
      });
    } else {
      const isOTPExists = await otpModel.findOne({ email: userEmail });

      let successMessage = "A verification code has been sent to your email: ";
      if (isOTPExists) {
        if (isOTPExists.expiredAt > Date.now()) {
          successMessage = "A new verification code has sent to your email: ";
        }
        await otpModel.findOneAndDelete({ _id: isOTPExists._id });
      }

      const newOTP = await new otpModel({
        email: userEmail,
        otpCode: newOTPCode,
        createdAt: Date.now(),
        expiredAt: expiredAt,
      });

      await newOTP.save();

      const getCurrentTime = new Date();
      const secondsRemaining = Math.floor((expiredAt - getCurrentTime) / 1000);

      const hideChars = (str) => {
        if (str.length <= 4) {
          return str;
        }
        return str.substring(0, 4) + "*******";
      };

      return res.status(200).json({
        expiredIn: secondsRemaining,
        message: successMessage + hideChars(userEmail),
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};

const verifyOTPAndChangePassword = async (req, res) => {
  try {
    let accessToken = req.headers["x-access-token"];
    const verifiedToken = await verifyUserAccessToken(accessToken);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }
    const user = await User.findById(verifiedToken.userId);

    const { otpCode, newPassword } = req.body;

    if (!otpCode) {
      return res.status(400).json({
        status: "Bad Request!",
        message: "OTP Code is required!",
      });
    }
    if (!newPassword) {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Password are required!",
      });
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,30}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "New password is invalid!",
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }
    const userEmail = user.email;
    const oldUserPassword = user.password;
    const isPasswordMatch = await bcrypt.compareSync(
      newPassword,
      oldUserPassword
    );

    if (isPasswordMatch) {
      return res.status(400).json({
        message: "New password must be different from the old password!",
      });
    }

    const otpRecord = await otpModel.findOne({ email: userEmail });

    if (!otpRecord) {
      return res.status(404).json({
        message: "Request OTP Code first!",
      });
    }

    if (otpRecord.otpCode !== otpCode) {
      return res.status(400).json({
        message: "OTP code is invalid!",
      });
    }

    if (otpRecord.expiredAt < Date.now()) {
      return res.status(400).json({
        message: "This OTP code has expired!",
      });
    }

    user.password = bcrypt.hashSync(newPassword, 8);
    await user.save();

    await otpModel.findOneAndDelete({ _id: otpRecord._id });

    return res.status(200).json({
      message: "Changed password successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};

module.exports = {
  sendOTPEmail,
  verifyOTPAndChangePassword,
};
