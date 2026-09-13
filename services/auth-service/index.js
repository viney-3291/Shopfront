import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-key-change-me";
const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "users.json");

function loadUsers() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("failed to persist users:", err.message);
  }
}

let users = loadUsers();

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "auth-service" }));

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "email already registered" });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: "u" + (users.length + 1) + "_" + Date.now(), name, email, password: hashed };
  users.push(user);
  saveUsers(users);
  const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "12h" });
  res.status(201).json({ user: publicUser(user), token });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password))) {
    return res.status(401).json({ error: "invalid email or password" });
  }
  const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ user: publicUser(user), token });
});

app.get("/auth/verify", (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false, error: "invalid or expired token" });
  }
});

app.listen(PORT, () => console.log(`auth-service listening on :${PORT}`));
