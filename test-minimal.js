require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
  }
});

async function test() {
  console.log("Testing with user:", process.env.EMAIL_USER);
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Minimal Test",
      text: "Testing SMTP connection"
    });
    console.log("Message sent:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    console.log("Envelope:", info.envelope);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
