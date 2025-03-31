const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleModel = new Schema({
  name: {
    type: String,
    require: true,
    unique: true,
  },
});
module.exports = mongoose.model("Role", roleModel);
