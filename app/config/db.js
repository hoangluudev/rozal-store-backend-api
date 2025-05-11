const mongoose = require("mongoose");
const { env } = require("../config/environment");
const { roleInitial } = require("../../data");
const initializeScheduledJobs = require("../services/initializeScheduledJobs");
const mongodb_uri = `mongodb+srv://${env.DB_USERNAME}:${env.DB_PASSWORD}@rozal-store-cloud-db.gqpurcv.mongodb.net/?retryWrites=true&w=majority&appName=rozal-store-cloud-db`;

module.exports = {
  connectDB: async () => {
    // mongoose
    //   .connect(process.env.MONGODB_URL)
    //   .then(() => {
    //     console.log("Connect to MongoDB Successfully");
    //     roleInitial();
    //     initializeScheduledJobs();
    //   })
    //   .catch((err) => {
    //     console.log("Connect MongoDB Failed");
    //     console.log("Failed Reason: ", err.message);
    //   });
    console.log("Connecting to Database...")
    await mongoose
      .connect(mongodb_uri)
      .then(() => {
        console.log("Connected to MongoDB successfully ✅");
        roleInitial();
        initializeScheduledJobs();
      })
      .catch((err) => {
        console.log("❌ MongoDB connection failed:", err.message);
      });
  },
};
