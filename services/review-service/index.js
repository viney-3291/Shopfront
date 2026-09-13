import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4008;
const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "reviews.json");

function loadReviews() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveReviews(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("failed to persist reviews:", err.message);
  }
}

let reviews = loadReviews(); // { [productId]: [{id, userName, rating, comment, createdAt}] }

app.get("/health", (req, res) => res.json({ status: "ok", service: "review-service" }));

app.get("/reviews/:productId", (req, res) => {
  const list = reviews[req.params.productId] || [];
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  res.json({ productId: req.params.productId, average: Number(avg.toFixed(1)), count: list.length, reviews: list });
});

app.post("/reviews/:productId", (req, res) => {
  const { userName, rating, comment } = req.body || {};
  const r = Number(rating);
  if (!userName || !r || r < 1 || r > 5) {
    return res.status(400).json({ error: "userName and rating (1-5) are required" });
  }
  const productId = req.params.productId;
  if (!reviews[productId]) reviews[productId] = [];
  const review = {
    id: "r" + Date.now(),
    userName,
    rating: r,
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };
  reviews[productId].push(review);
  saveReviews(reviews);
  res.status(201).json(review);
});

app.listen(PORT, () => console.log(`review-service listening on :${PORT}`));
