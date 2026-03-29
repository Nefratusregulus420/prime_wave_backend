require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("Testing SMTP connection for:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("Test Failed: ", error);
  } else {
    console.log("Test Success! Server is ready to take our messages");
  }
});
