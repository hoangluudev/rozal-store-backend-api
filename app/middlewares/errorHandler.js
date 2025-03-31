const { env } = require("../config/environment");

const errorHandlerMiddleware = (error, req, res, next) => {
  const responseError = {
    status: error.status,
    message: error.message || "Internal Server Error",
    stack: error.stack,
  };

  if (env.IS_DEV_MODE) delete responseError.stack;

  res.status(error.statusCode || 500).json(responseError);
};
module.exports = { errorHandlerMiddleware };
