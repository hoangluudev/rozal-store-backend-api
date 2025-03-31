const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");
const imageModel = require("../models/image.model");
const { getExpirationDate } = require("../utils/ProductHelperFunctions");

const uploadImageAndSaveToDB = async (file, folder, user) => {
  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      { timeout: 60000, folder: `${folder}` },
      (err, result) => {
        if (err) {
          return reject(err);
        }

        fs.unlinkSync(file.path);
        resolve(result);
      }
    );
  });

  let newImage = {
    user: user,
    title: uploadResult.original_filename,
    imageUrl: uploadResult.url,
    cloudinaryId: uploadResult.public_id,
    folder: uploadResult.asset_folder,
    createdAt: uploadResult.created_at,
  };

  const savedImage = await imageModel.create(newImage);
  return savedImage;
};
const deleteImageByPublicId = async (publicId) => {
  const existingImage = await imageModel.findOne({ cloudinaryId: publicId });

  if (!existingImage) {
    throw new Error("Image not found!");
  }
  await new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { timeout: 60000 }, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
  });

  await imageModel.deleteOne({ cloudinaryId: publicId });
  return { message: "Image deleted successfully." };
};
const updateImageUsageStatus = async (url, boolean) => {
  const existedImage = await imageModel.findOne({ imageUrl: url });

  if (existedImage) {
    existedImage.isInUse = boolean;
    if (boolean === false) {
      existedImage.deleteAt = getExpirationDate(7);
    }
    existedImage.save();
  }
};
const deleteLocalTempImage = (file) => {
  try {
    if (!file || !file.path) {
      throw new Error("No image or invalid image path");
    }
    fs.unlinkSync(file.path);
  } catch (error) {
    throw new Error("Failed to delete local images");
  }
};
const deleteLocalTempImages = (files) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error("No images");
    }
    files.forEach((file) => {
      fs.unlinkSync(file.path);
    });
  } catch (error) {
    throw new Error("Failed to delete local images");
  }
};

module.exports = {
  uploadImageAndSaveToDB,
  deleteImageByPublicId,
  deleteLocalTempImage,
  deleteLocalTempImages,
  updateImageUsageStatus,
};
