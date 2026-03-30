require("dotenv").config();
const { sendEmail } = require("./utils/sendEmail");

console.log("--------------------------------------------------");
console.log("🚀 SendGrid Diagnostic Tool");
console.log("--------------------------------------------------");
console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
console.log("SENDGRID_API_KEY present:", Boolean(process.env.SENDGRID_API_KEY));

async function runDiagnostics() {
  const start = Date.now();
  console.log("1. Sending test email via SendGrid...");

  const from = process.env.FROM_EMAIL;
  const to = process.argv[2] || from;

  if (!from) {
    console.error("❌ Missing FROM_EMAIL; cannot send diagnostic email.");
    return;
  }

  if (!to) {
    console.error("❌ Missing recipient. Provide one like: node test-smtp.js someone@gmail.com");
    return;
  }

  if (to === from) {
    console.warn("⚠️ Skipping send because recipient equals sender (to === from).", { to, from });
    return;
  }

  const iso = new Date().toISOString();
  const subject = `Test Email - ${iso}`;
  const text = "If you received this, your configuration is working.\n\nThis is the plain-text fallback.";
  const html =
    "<h2>SendGrid Test</h2>" +
    "<p>If you received this, your configuration is working.</p>" +
    "<p>This message includes <strong>HTML</strong> + text fallback.</p>";

  const result = await sendEmail(
    to,
    subject,
    text,
    html
  );

  const duration = (Date.now() - start) / 1000;
  console.log("2. Result:", result);
  console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
  console.log("--------------------------------------------------");
}

runDiagnostics().catch((e) => {
  console.error("❌ Diagnostic failed with unexpected error:", e?.message || e);
  console.log("--------------------------------------------------");
});
