require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ["https://prime-wave-frontend.vercel.app", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

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

// Transporter using Gmail service with optimized settings for Render
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '', // Remove spaces from App Password
  },
  pool: true, // Use connection pooling
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false // Sometimes needed for Render/outbound IPs
  }
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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        error: "SMTP is not configured on the server (missing EMAIL_USER/EMAIL_PASS).",
      });
    }

    // Insert into PostgreSQL database (wrapped in try/catch so it doesn't block SMTP if DB fails)
    let dbId = null;
    try {
      const insertQuery = `INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3) RETURNING id`;
      const dbResult = await pool.query(insertQuery, [name, email, message]);
      dbId = dbResult.rows[0].id;
      console.log(`Successfully saved to database with ID: ${dbId}`);
    } catch (err) {
      console.error("⚠️ Database insert failed, but proceeding with emails:", err.message);
    }

    // 1. Email to the user (Confirmation)
    const mailToUser = {
      from: `"PrimeWave Team" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: "Confirmation: We've received your message - PrimeWave",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #4fc3f7;">Hello ${name || "there"},</h2>
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

    // 2. Email to the Admin (New Inquiry Notification)
    const mailToAdmin = {
      from: `"PrimeWave Web-Form" <${process.env.EMAIL_USER}>`,
      replyTo: email, // Admin can reply directly to the user
      to: process.env.EMAIL_USER, // The website owner receives this
      subject: `New Inquiry from ${name || "Unknown User"}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">New Website Inquiry</h2>
          <p><strong>Name:</strong> ${name || "Not provided"}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 6px;">
            ${message}
          </div>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 20px;">
            Submitted at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    // Send emails with retry logic
    const sendWithRetry = async (options, label, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const info = await transporter.sendMail(options);
          console.log(`✅ ${label} successfully accepted by SMTP server for:`, info.accepted);
          return { 
            ok: true, 
            messageId: info.messageId, 
            accepted: info.accepted, 
            rejected: info.rejected 
          };
        } catch (err) {
          console.error(`❌ ${label} attempt ${i + 1} failed:`, err.message);
          if (i === retries - 1) throw err;
          await new Promise(res => setTimeout(res, 2000 * (i + 1))); 
        }
      }
    };

    // IMPORTANT: await email sends so the UI only shows success when SMTP succeeds
    // Send sequentially to ensure maximum stability and clearer logs
    const userResult = await sendWithRetry(mailToUser, "Confirmation Email");
    const adminResult = await sendWithRetry(mailToAdmin, "Admin Notification");

    res.status(200).json({
      success: true,
      message: "Your message has been received and emails were sent successfully.",
      id: dbResult.rows[0].id,
      emails: {
        user: userResult,
        admin: adminResult,
      },
    });

  } catch (error) {
    console.error("Error in /api/contact:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while processing your request.",
      details: error?.message || String(error),
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
