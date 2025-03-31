const nodemailer = require("nodemailer");

const sendOTPEmailService = async (otpOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_TRANSPORTER_USERNAME,
      pass: process.env.EMAIL_TRANSPORTER_PASSWORD,
    },
  });
  const brandName = process.env.PROJECT_BRAND_NAME;
  const emailOptions = {
    from: '"Rozal Store" <noreply@rozalstore.support.com>',
    to: otpOptions.email,
    subject: otpOptions.subjectContent,
    html: `<div
    style="
      font-family: Helvetica, Arial, sans-serif;
      min-width: 1000px;
      overflow: auto;
      background-color: #e0e0e0;
    "
  >
    <div
      style="
        margin: 50px auto;
        width: 70%;
        padding: 3rem;
        background-color: #f5f5f5;
      "
    >
      <div style="border-bottom: 1px solid #eee">
        <a
          href="#"
          style="
            font-size: 1.4em;
            color: #ef5350;
            text-decoration: none;
            font-weight: 600;
          "
        >
          ${brandName}
        </a>
      </div>
      <p style="font-size: 1.1em; margin: 0.5rem 0">Hi,</p>
      <p style="margin-top: 0; margin: 0.5rem 0">
        To complete your password change, here's your one-time
        verification code:
      </p>
      <h2
        style="
          background: #ef5350;
          margin: 0 auto;
          width: max-content;
          padding: 10px 2rem;
          color: #fff;
          border-radius: 4px;
        "
      >
        ${otpOptions.otpCode}
      </h2>
      <p style="margin: 0.5rem 0">This code expires in 5 minutes.</p>
      <p style="margin: 0.5rem 0">
        Simply enter this code in our app or website to finish the process.
      </p>
      <p style="margin: 0.5rem 0">
        If you did not make this request, please disregard this email.
      </p>
      <p>Thanks!</p>
      <hr style="border: none; border-top: 1px solid #eee" />
      <div
        style="
          text-align: right;
          padding: 8px 0;
          color: #aaa;
          font-size: 0.8em;
          line-height: 1;
          font-weight: 300;
        "
      >
        <p>${brandName} Inc</p>
        <p>1600 Amphitheatre Parkway</p>
        <p>California</p>
      </div>
    </div>
  </div>`,
  };
  try {
    await transporter.sendMail(emailOptions);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
    };
  }
};

module.exports = {
  sendOTPEmailService,
};
