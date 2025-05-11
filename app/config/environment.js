const env = {
  BUILD_MODE: process.env.BUILD_MODE,
  IS_DEV_MODE: process.env.BUILD_MODE === "development",
  DB_USERNAME: process.env.DB_USERNAME || "username",
  DB_PASSWORD: process.env.DB_PASSWORD || "username",
};
module.exports = {
  env,
};
