require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Agenda = require("agenda");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const agenda = new Agenda({ db: { address: process.env.MONGO_URI } });

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Define Job for Sending Emails
agenda.define("send email", async (job) => {
  const { to, subject, text } = job.attrs.data;
  console.log("Email job data:", { to, subject, text }); // Debug log
  try {
    if (!to) {
      throw new Error("No recipients defined");
    }
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
});

// API to Schedule Emails
app.post("/api/flowchart/save", async (req, res) => {
  const { to, subject, text, delay } = req.body;

  // Validate request body
  if (!to || !subject || !text || !delay) {
    return res.status(400).json({ error: "All fields (to, subject, text, delay) are required." });
  }

  try {
    await agenda.start();
    await agenda.schedule(delay, "send email", { to, subject, text });
    res.json({ message: "Email scheduled successfully!" });
  } catch (error) {
    console.error("Error scheduling email:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));