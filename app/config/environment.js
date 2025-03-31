const env = {
  BUILD_MODE: process.env.BUILD_MODE,
  IS_DEV_MODE: process.env.BUILD_MODE === "development",
};
module.exports = {
  env,
};
