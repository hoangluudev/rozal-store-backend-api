const mongoose = require("mongoose");

mongoose.Promis = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.models");
db.refreshToken = require("./refreshToken.model");

db.ROLES = ["guest", "user", "admin", "manager"];

module.exports = db;
