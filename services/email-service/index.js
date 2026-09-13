import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4011;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mailhog",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
  ignoreTLS: true,
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "email-service" }));

app.post("/send", async (req, res) => {
  const { to, subject, text, html } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: "to and subject are required" });
  }
  try {
    const info = await transporter.sendMail({
      from: '"Shopfront Demo" <no-reply@shopfront.demo>',
      to,
      subject,
      text: text || "",
      html: html || undefined,
    });
    res.status(201).json({ sent: true, messageId: info.messageId });
  } catch (err) {
    console.error("email send failed:", err.message);
    res.status(502).json({ sent: false, error: "could not reach mail server" });
  }
});

app.listen(PORT, () => console.log(`email-service listening on :${PORT}`));
