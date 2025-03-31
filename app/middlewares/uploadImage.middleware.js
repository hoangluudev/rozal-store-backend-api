const multer = require("multer");

const checkValidFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: "Bad Request!",
      message: "No file uploaded.",
    });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      status: "Bad Request!",
      message: "Invalid file type: not an image!",
    });
  }

  next();
};
const checkValidFiles = (req, res, next) => {
  if (req.files.length === 0) {
    return res.status(400).json({
      status: "Bad Request!",
      message: "No file uploaded.",
    });
  }
  for (let file of req.files) {
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Invalid file type: not an image!",
      });
    }
  }

  next();
};

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Maximum file limit exceeded.",
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "Bad Request!",
        message: "Only images less than 1MB are allowed.",
      });
    }

    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res
      .status(500)
      .json({ status: "Internal Server Error.", message: err.message });
  }
  next();
};

module.exports = { checkValidFile, checkValidFiles, handleUploadError };
