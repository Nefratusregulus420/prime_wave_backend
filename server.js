require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

// Test Database Connection and Create Table
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL successfully");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error connecting to database or creating table:", err.message);
  }
};

initDb();

// Transporter using Gmail service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verification for Transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Configuration Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!email || !message) {
    return res
      .status(400)
      .json({ error: "Email and message are required" });
  }

  try {
    // Insert into PostgreSQL database
    const insertQuery = `INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3) RETURNING id`;
    const dbResult = await pool.query(insertQuery, [name, email, message]);
    console.log(`Successfully saved to database with ID: ${dbResult.rows[0].id}`);

    // Email to the user
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Confirmation: We've received your message - PrimeWave",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #4fc3f7;">Hello ${name || ""},</h2>
          <p>Thank you for getting in touch with <strong>PrimeWave Lifestyle & Electronics</strong>.</p>
          <p>This is an automated confirmation that we've successfully received your inquiry. Our team will contact within 48hrs.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Here is a summary of your message:</strong></p>
          <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #4fc3f7; font-style: italic;">
            ${message}
          </p>
          <br />
          <p>Best Regards,</p>
          <p><strong>PrimeWave Team</strong><br/>
          <a href="mailto:primewavelifestyle@gmail.com" style="color: #ff8a65;">primewavelifestyle@gmail.com</a></p>
        </div>
      `,
    };

    // Send email with delay as per original logic
    setTimeout(async () => {
      try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent to:", email);
      } catch (emailErr) {
        console.error("Email sending error:", emailErr);
      }
    }, 5000);

    // Return success response immediately or after email? 
    // The original code waited for email. I'll maintain that but make it more robust.
    // Wait, the original code had:
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // await transporter.sendMail(mailOptions);
    // res.status(200).json({ success: true, message: "Email sent successfully" });
    
    // Let's stick to the original behavior but with the new database logic.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: "Data saved and email sent successfully",
      id: dbResult.rows[0].id
    });

  } catch (error) {
    console.error("Error in /api/contact:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while processing your request.",
      details: error.message
    });
  }
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
