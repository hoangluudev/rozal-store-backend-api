const Notification = require("./models/Notification");

const createNotification = async (
  userId,
  message,
  type = "info",
  thumbnail = null
) => {
  try {
    const notification = new Notification({
      userId,
      message,
      type,
      isRead: false,
      isRemove: false,
      thumbnail,
    });

    await notification.save();
    return notification;
  } catch (error) {
    throw new Error("Error creating notification: " + error.message);
  }
};

module.exports = {
  createNotification,
};
