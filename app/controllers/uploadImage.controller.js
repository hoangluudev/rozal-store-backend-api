const imageModel = require("../models/image.model");
const UserModel = require("../models/user.model");
const { createError } = require("../services/createError.service");
const {
  deleteImageByPublicId,
  uploadImageAndSaveToDB,
  deleteLocalTempImages,
  deleteLocalTempImage,
} = require("../services/uploadImage.service");
const {
  verifyUserAccessToken,
} = require("../services/verifyUserToken.service");
const {
  isArray,
  validateTablePage,
  validateTableLimit,
  isFilterData,
} = require("../utils/HelperFunctions");

const getAllImages = async (req, res) => {
  try {
    const images = await imageModel.find();

    const deleteResults = [];

    for (const image of images) {
      if (!image.isInUse && image.deleteAt < new Date()) {
        const result = await deleteImageByPublicId(image.cloudinaryId);
        deleteResults.push({
          cloudinaryId: image.cloudinaryId,
          message: result.message || "Deleted",
        });
      }
    }

    const { folder } = req.query;
    let page = parseInt(req.query.page, 10) || 0;
    let limit = validateTableLimit(parseInt(req.query.limit, 10)) || 10;

    let filter = {};
    if (folder) filter.folder = folder;

    const totalItemCount = await imageModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItemCount / limit);

    page = validateTablePage(page, totalPages);
    const skip = parseInt(page, 10) * parseInt(limit, 10);

    const result = await imageModel
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit));

    const response = {
      status: "Get all images successfully.",
      data: result,
      totalItemCount,
      page,
      limit,
      isFilterOn: isFilterData(folder),
      filterValue: req.query,
    };
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "Internal Server Error",
      message: error.message,
    });
  }
};
const uploadImageToDB = async (req, res) => {
  const image = req.file ? req.file : null;
  try {
    const folder = req.body.folder || "example";
    let accessToken = req.headers["x-access-token"];
    const verifiedToken = await verifyUserAccessToken(accessToken);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }
    const user = await UserModel.findById(verifiedToken.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }
    const result = await uploadImageAndSaveToDB(image, folder, user);
    let imageUrl = result.imageUrl;

    return res.status(200).json({
      message: "Uploaded Successfully",
      data: imageUrl,
    });
  } catch (error) {
    if (image && image.path) {
      await deleteLocalTempImage(image);
    }
    return res.status(500).json({
      status: error.status || "Internal Server Error",
      message: error.message || "An error occurred during the upload process",
    });
  }
};
const uploadMultipleImageToDB = async (req, res) => {
  const images = req.files;
  try {
    const folder = req.body.folder || "example";

    let accessToken = req.headers["x-access-token"];
    const verifiedToken = await verifyUserAccessToken(accessToken);
    if (!verifiedToken.success) {
      return res.status(401).json({
        message: verifiedToken.message,
      });
    }
    const user = await UserModel.findById(verifiedToken.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const imageUrls = [];
    for (const image of images) {
      const savedImage = await uploadImageAndSaveToDB(image, folder, user);
      imageUrls.push(savedImage.imageUrl);
    }

    return res.status(200).json({
      message: "Uploaded Successfully",
      data: imageUrls,
    });
  } catch (error) {
    if (images.length > 0) {
      await deleteLocalTempImages(images);
    }
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteImageFromDB = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return createError(400, "Public ID is required!");
    }

    const result = await deleteImageByPublicId(publicId);

    return res.status(200).json({
      message: "Image deleted successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};
const deleteMultipleImageFromDB = async (req, res) => {
  try {
    const { publicIds } = req.body;

    if (!isArray(publicIds) || publicIds.length === 0) {
      return createError(400, "Public IDs are required!");
    }

    const deleteResults = [];
    for (const publicId of publicIds) {
      let existedImage = await imageModel.findOne({
        cloudinaryId: publicId,
      });
      if (!existedImage) {
        deleteResults.push({
          publicId,
          message: "Not Found",
        });
      } else {
        const result = await deleteImageByPublicId(publicId);
        deleteResults.push({
          publicId,
          message: result.message || "Deleted",
        });
      }
    }

    return res.status(200).json({
      message: "Images deleted successfully",
      data: deleteResults,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.status,
      message: error.message,
    });
  }
};

module.exports = {
  getAllImages,
  uploadImageToDB,
  uploadMultipleImageToDB,
  deleteImageFromDB,
  deleteMultipleImageFromDB,
};
