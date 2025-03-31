const express = require("express");
const router = express.Router();
const {
  getAllImages,
  uploadImageToDB,
  uploadMultipleImageToDB,
  deleteImageFromDB,
  deleteMultipleImageFromDB,
} = require("../controllers/uploadImage.controller");
const upload = require("../config/multerConfig");
const {
  checkValidFile,
  checkValidFiles,
  handleUploadError,
} = require("../middlewares/uploadImage.middleware");
const { verifyToken } = require("../middlewares/user.middleware");

router.get("/", getAllImages);
router.post(
  "/upload/single",
  upload.single("image", 1),
  [verifyToken, checkValidFile, handleUploadError],
  uploadImageToDB
);
router.post(
  "/upload/multiple",
  upload.array("images", 6),
  [verifyToken, checkValidFiles, handleUploadError],
  uploadMultipleImageToDB
);
router.delete("/delete/single", deleteImageFromDB);
router.delete("/delete/multiple", deleteMultipleImageFromDB);

module.exports = router;
