const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const { errorHandlerMiddleware } = require("./app/middlewares/errorHandler");
const { connectDB } = require("./app/config/db");
const { env } = require("./app/config/environment");
const allowedOrigin = env.CLIENT_URL;

const port = process.env.SERVER_PORT || 8000;

const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

connectDB();

app.use("/api/v1/auth/users", require("./app/routes/auth.routes"));
app.use("/api/v1/users", require("./app/routes/user.routes"));
app.use("/api/v1/products", require("./app/routes/product.routes"));
app.use("/api/v1/admin", require("./app/routes/adminManagement.routes"));
app.use("/api/v1/dashboard", require("./app/routes/dashboard.routes"));
app.use("/api/v1/otp-auth", require("./app/routes/otpAuth.routes"));
app.use("/api/v1/images", require("./app/routes/image.routes"));
app.use("/api/v1", require("./app/routes/index.routes"));

app.all("*", (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on the server!`);
  err.status = "Not Found";
  err.statusCode = 404;
  next(err);
});

app.use(errorHandlerMiddleware);

app.listen(port, () => {
  console.log("App listening on port", port);
});
