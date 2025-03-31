const { env } = require("../config/environment");
const IS_DEV_MODE = env.IS_DEV_MODE;

module.exports = {
  devConsLogger: (message) => {
    if (IS_DEV_MODE) console.log(message);
  },
  devErrorLogger: (message, error) => {
    if (IS_DEV_MODE) console.error(message, error);
  },
};
