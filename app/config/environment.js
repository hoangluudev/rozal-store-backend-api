const env = {
  CLIENT_URL: process.env.REACT_APP_URL,
  BUILD_MODE: process.env.BUILD_MODE,
  IS_DEV_MODE: process.env.BUILD_MODE === "development",
  DB_USERNAME: process.env.DB_USERNAME || "username",
  DB_PASSWORD: process.env.DB_PASSWORD || "password",
};
module.exports = {
  env,
};
