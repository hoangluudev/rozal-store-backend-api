const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const { errorHandlerMiddleware } = require("./app/middlewares/errorHandler");
const { connectDB } = require("./app/config/db");

const port = process.env.SERVER_PORT || 8000;

const corsOptions = {
  origin: process.env.REACT_APP_URL,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

connectDB();

app.use("/shop24h/auth/users", require("./app/routes/auth.routes"));
app.use("/shop24h/users", require("./app/routes/user.routes"));
app.use("/shop24h/products", require("./app/routes/product.routes"));
app.use("/shop24h/admin", require("./app/routes/adminManagement.routes"));
app.use("/shop24h/dashboard", require("./app/routes/dashboard.routes"));
app.use("/shop24h/otp-auth", require("./app/routes/otpAuth.routes"));
app.use("/shop24h/images", require("./app/routes/image.routes"));
app.use("/shop24h", require("./app/routes/index.routes"));

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
