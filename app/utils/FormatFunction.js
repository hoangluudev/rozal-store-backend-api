const moment = require("moment");
module.exports = {
  toCapitalize: (string) => {
    let words = string.toLowerCase().split(" ");
    for (let i = 0; i < words.length; i++) {
      if (words[i].length > 10) {
        words[i] =
          words[i].charAt(0).toUpperCase() + words[i].slice(1).toUpperCase();
      }
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(" ");
  },
  stripHtmlTags: (html) => {
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  },
  stringToSlug: (string) => {
    let words = string.toLowerCase().split(" ");
    return words.join("-");
  },
  convertStringToNumber: (str) => {
    return parseInt(str, 10);
  },
  convertISODateToLongDateFormat: (dateString) => {
    return moment(dateString).format("dddd, MMMM D, YYYY");
  },
};
