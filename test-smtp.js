require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("--------------------------------------------------");
console.log("🚀 SMTP Diagnostic Tool");
console.log("--------------------------------------------------");
console.log("Testing SMTP connection for:", process.env.EMAIL_USER);

// Clean password for common copy-paste errors
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPass
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false
  }
});

async function runDiagnostics() {
  const start = Date.now();
  console.log("1. Starting verification...");
  
  try {
    await transporter.verify();
    const duration = (Date.now() - start) / 1000;
    console.log(`✅ Success: SMTP server is reachable and credentials are valid!`);
    console.log(`⏱️  Latency: ${duration.toFixed(2)} seconds`);
    
    console.log("2. Sending test email...");
    const testMailStart = Date.now();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "SMTP Diagnostic Test",
      text: "If you received this, your SMTP configuration is working correctly!"
    });
    const testMailDuration = (Date.now() - testMailStart) / 1000;
    console.log(`✅ Success: Test email sent successfully!`);
    console.log(`⏱️  Email Send Latency: ${testMailDuration.toFixed(2)} seconds`);
    
  } catch (error) {
    console.error("❌ Diagnostic Failed: ", error.message);
    if (error.code === 'EAUTH') {
      console.log("💡 Suggestion: Check if your 'App Password' is correct and hasn't been revoked.");
    } else if (error.code === 'ETIMEDOUT') {
      console.log("💡 Suggestion: Connection timed out. This often happens on Render Free Tier due to outbound IP restrictions.");
    }
  } finally {
    console.log("--------------------------------------------------");
  }
}

runDiagnostics();
