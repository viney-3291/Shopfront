import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4007;

const ZONES = {
  domestic: { baseRate: 5.0, perKg: 1.5, etaDays: 3 },
  regional: { baseRate: 12.0, perKg: 3.0, etaDays: 6 },
  international: { baseRate: 25.0, perKg: 6.0, etaDays: 12 },
};

function zoneFor(country) {
  const c = (country || "").trim().toUpperCase();
  if (c === "CA" || c === "CANADA") return "domestic";
  if (c === "US" || c === "USA") return "regional";
  return "international";
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "shipping-service" }));

app.post("/shipping/estimate", (req, res) => {
  const { country, weightKg } = req.body || {};
  const weight = Number(weightKg) > 0 ? Number(weightKg) : 1;
  const zoneName = zoneFor(country);
  const zone = ZONES[zoneName];
  const cost = Number((zone.baseRate + zone.perKg * weight).toFixed(2));
  res.json({ zone: zoneName, cost, currency: "USD", etaDays: zone.etaDays });
});

app.listen(PORT, () => console.log(`shipping-service listening on :${PORT}`));
