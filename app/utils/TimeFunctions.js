const momentTZ = require("moment-timezone");

module.exports = {
  convertUTCtoGMT7: (utcTimestamp) => {
    return momentTZ.utc(utcTimestamp).tz("Asia/Bangkok").format();
  },
  convertUTCtoDateGMT7: (utcTimestamp) => {
    return momentTZ.utc(utcTimestamp).tz("Asia/Bangkok").format("YYYY-MM-DD");
  },
  convertUTCtoStringGMT7: (utcTimestamp) => {
    return momentTZ
      .utc(utcTimestamp)
      .tz("Asia/Bangkok")
      .format("YYYY-MM-DD HH:mm");
  },
  getTodayDateGMT7: () => {
    return momentTZ
      .utc(new Date())
      .tz("Asia/Bangkok")
      .format("YYYY-MM-DD HH:mm");
  },
  compareTimestamps: (timestamp1, timestamp2) => {
    const format = "YYYY-MM-DD HH:mm";
    const date1 = momentTZ(timestamp1, format);
    const date2 = momentTZ(timestamp2, format);

    if (date1.isAfter(date2)) {
      return true;
    } else if (date1.isBefore(date2)) {
      return false;
    } else {
      return false;
    }
  },
  convertGMT7TimestampToSeconds: (timestamp) => {
    const targetTime = momentTZ(timestamp, "YYYY-MM-DD HH:mm");
    const now = momentTZ();
    const differenceInSeconds = targetTime.diff(now, "seconds");
    return differenceInSeconds > 0 ? differenceInSeconds : 0;
  },
  convertUTCTimestampToSeconds: (timestamp) => {
    const targetTime = momentTZ(timestamp);
    const now = momentTZ();
    const differenceInSeconds = targetTime.diff(now, "seconds");
    return differenceInSeconds > 0 ? differenceInSeconds : 0;
  },
};
