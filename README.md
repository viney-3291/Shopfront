# Shopfront — a small microservices e-commerce demo

A working (mock) online store: browse products, search, read/leave reviews,
get recommendations, add to cart, check out, and receive an order
confirmation email — all served by 13 small backend services behind a
gateway, plus a React storefront.

Everything runs locally with Docker Compose from this one folder. No cloud
account, no signup, no real payments or real emails — payments are
simulated and "sent" emails land in a local inbox you can view in your
browser.

## What's inside

| Service | Language | Job |
|---|---|---|
| frontend | React + nginx | the storefront UI |
| api-gateway | Node | single entry point, proxies to every backend service |
| auth-service | Node | register/login, JWTs |
| product-service | Go | product catalog |
| cart-service | Go | per-user cart (backed by Redis) |
| inventory-service | Go | stock levels, reserve/release on checkout |
| search-service | Go | keyword search over the catalog |
| order-service | Python (FastAPI) | orchestrates checkout: reserve stock → charge → notify |
| payment-service | Python (FastAPI) | mock payment gateway (randomly declines sometimes, on purpose) |
| recommendation-service | Python (FastAPI) | "you might also like" |
| notification-service | Python (FastAPI) | builds the email content and hands it to email-service |
| shipping-service | Node | shipping cost/ETA estimate |
| review-service | Node | product reviews |
| email-service | Node | actually sends the mail (to a local catcher, not the real internet) |
| redis | — | cart storage |
| mailhog | — | catches outgoing mail so you can view it at `localhost:8025` |

This mirrors a real order flow: **browse → cart → checkout → reserve
inventory → charge payment → confirmation email**, with a rollback path if
payment or stock fails.

## Requirements

- Docker Desktop (with Compose v2, which ships with it by default)
- ~2GB of free RAM for the containers themselves — comfortably fits an 8GB
  Mac Air alongside normal apps. Every service has a memory cap set in
  `docker-compose.yml` so nothing runs away.

## Run it

1. Unzip this folder anywhere on your machine.
2. Open a terminal in the folder and run:

   ```bash
   docker compose up --build
   ```

   First run builds 13 small images, so it can take a few minutes. After
   that, `docker compose up` (no `--build`) starts in seconds.

3. Open the app:
   - Storefront: **http://localhost:3000**
   - "Sent" emails (order confirmations): **http://localhost:8025**
   - Raw API (optional, for poking around): **http://localhost:8080/api/health**

4. To stop everything:

   ```bash
   docker compose down
   ```

   Add `-v` to also wipe the persisted data (users, orders, reviews):

   ```bash
   docker compose down -v
   ```

## Trying the full flow

1. Register an account (any email/password — nothing is verified).
2. Add a couple of products to your cart.
3. Go to Cart → pick a shipping region → estimate shipping → Checkout.
4. Check `localhost:8025` — your order confirmation email is sitting
   there, sent by `notification-service` through `email-service`.
5. Visit `/orders` to see your order history, and `/status` for a live
   health dashboard of all 13 services (handy if something didn't start).

Payments fail on purpose sometimes (~8% of the time, or reliably if the
total ends in `.13`) so you can see the failure/rollback path: inventory
gets released and you get a "payment declined" email instead.

## Notes on the "small footprint" choices

- Go services use only the standard library — no framework overhead.
- Product images are local SVGs, not fetched from the internet.
- Data that needs to survive a restart (users, orders, reviews) is kept
  in small JSON files on named Docker volumes rather than a full database
  server, to save RAM. Cart data lives in Redis, the closest thing to a
  "real" piece of infra here.
- Every container has an explicit `mem_limit` in `docker-compose.yml` —
  feel free to tighten or loosen these.

## Extending it

Each service is a self-contained folder under `services/<name>/` with its
own Dockerfile — add a new one, wire it into `docker-compose.yml`, and add
a route for it in `services/api-gateway/index.js`.
