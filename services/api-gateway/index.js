import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Map of URL prefix -> upstream service.
// Each backend keeps the same resource name in its own routes (e.g. auth-service
// exposes /auth/login), so we only ever need to strip the leading "/api".
const routes = {
  "/api/auth": "http://auth-service:4001",
  "/api/products": "http://product-service:4002",
  "/api/cart": "http://cart-service:4003",
  "/api/inventory": "http://inventory-service:4004",
  "/api/orders": "http://order-service:4005",
  "/api/payments": "http://payment-service:4006",
  "/api/shipping": "http://shipping-service:4007",
  "/api/reviews": "http://review-service:4008",
  "/api/recommendations": "http://recommendation-service:4009",
  "/api/notifications": "http://notification-service:4010",
  "/api/search": "http://search-service:4012",
};

for (const [prefix, target] of Object.entries(routes)) {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      on: {
        error: (err, req, res) => {
          console.error(`upstream error for ${prefix}:`, err.message);
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
          }
          res.end(JSON.stringify({ error: "upstream service unavailable", service: prefix }));
        },
      },
    })
  );
}

app.get("/api/health", async (req, res) => {
  const checks = {};
  await Promise.all(
    Object.entries(routes).map(async ([prefix, target]) => {
      const name = prefix.replace("/api/", "");
      try {
        const r = await fetch(target + "/health", { signal: AbortSignal.timeout(2000) });
        checks[name] = r.ok ? "up" : "degraded";
      } catch {
        checks[name] = "down";
      }
    })
  );
  res.json({ gateway: "ok", services: checks });
});

app.listen(PORT, () => console.log(`api-gateway listening on :${PORT}`));
