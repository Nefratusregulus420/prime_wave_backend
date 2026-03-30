require("dotenv").config();
const { sendEmail } = require("./utils/sendEmail");

async function test() {
  try {
    const to = process.env.FROM_EMAIL;
    console.log("Testing SendGrid with FROM_EMAIL:", to);
    const result = await sendEmail(to, "Minimal Test", "Testing SendGrid email sending");
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
