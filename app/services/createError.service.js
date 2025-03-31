const { getReasonPhrase, StatusCodes } = require("http-status-codes");

module.exports = {
  createError: (statusCode = StatusCodes.INTERNAL_SERVER_ERROR, message) => {
    const error = new Error(message || getReasonPhrase(statusCode));
    error.status = getReasonPhrase(statusCode);
    error.statusCode = statusCode;
    throw error;
  },
};
