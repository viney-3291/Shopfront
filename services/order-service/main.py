import json
import os
import time
import uuid
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="order-service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.environ.get("DATA_DIR", "/data")
DATA_FILE = os.path.join(DATA_DIR, "orders.json")

INVENTORY_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://inventory-service:4004")
PAYMENT_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://payment-service:4006")
PRODUCT_URL = os.environ.get("PRODUCT_SERVICE_URL", "http://product-service:4002")
NOTIFICATION_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:4010")
CART_URL = os.environ.get("CART_SERVICE_URL", "http://cart-service:4003")


class OrderItem(BaseModel):
    productId: str
    quantity: int


class ShippingInfo(BaseModel):
    country: Optional[str] = "CA"
    weightKg: Optional[float] = 1.0


class CheckoutRequest(BaseModel):
    userId: str
    email: Optional[str] = None
    items: List[OrderItem]
    shipping: Optional[ShippingInfo] = ShippingInfo()


def load_orders():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def save_orders(orders):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(orders, f, indent=2)


orders_db = load_orders()


@app.get("/health")
def health():
    return {"status": "ok", "service": "order-service"}


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    for o in orders_db:
        if o["orderId"] == order_id:
            return o
    raise HTTPException(status_code=404, detail="order not found")


@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: str):
    return [o for o in orders_db if o["userId"] == user_id]


@app.post("/orders/checkout")
async def checkout(req: CheckoutRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="no items in order")

    order_id = "ord_" + uuid.uuid4().hex[:10]
    reserved_items = []

    async with httpx.AsyncClient(timeout=5.0) as client:
        # 1. price the order from product-service
        total = 0.0
        priced_items = []
        for item in req.items:
            try:
                pr = await client.get(f"{PRODUCT_URL}/products/{item.productId}")
                pr.raise_for_status()
                product = pr.json()
            except Exception:
                raise HTTPException(status_code=502, detail=f"could not price product {item.productId}")
            line_total = product["price"] * item.quantity
            total += line_total
            priced_items.append({
                "productId": item.productId,
                "name": product["name"],
                "quantity": item.quantity,
                "unitPrice": product["price"],
                "lineTotal": round(line_total, 2),
            })

        # 2. reserve inventory for every item; roll back on first failure
        for item in req.items:
            try:
                resv = await client.post(f"{INVENTORY_URL}/inventory/reserve",
                                          json={"productId": item.productId, "quantity": item.quantity})
            except Exception:
                resv = None
            if resv is None or resv.status_code != 200:
                for done in reserved_items:
                    await client.post(f"{INVENTORY_URL}/inventory/release", json=done)
                order = _record_order(order_id, req, priced_items, total, "failed", "insufficient stock")
                return order
            reserved_items.append({"productId": item.productId, "quantity": item.quantity})

        # 3. charge payment
        try:
            pay = await client.post(f"{PAYMENT_URL}/payments/charge",
                                     json={"orderId": order_id, "amount": round(total, 2)})
            payment_result = pay.json()
        except Exception:
            payment_result = {"status": "failed", "reason": "payment service unavailable"}

        if payment_result.get("status") != "success":
            for done in reserved_items:
                await client.post(f"{INVENTORY_URL}/inventory/release", json=done)
            order = _record_order(order_id, req, priced_items, total, "failed",
                                   payment_result.get("reason", "payment declined"))
            await _notify(client, req, order, "order_failed")
            return order

        # 4. success: clear cart, persist order, notify
        try:
            await client.delete(f"{CART_URL}/cart/{req.userId}")
        except Exception:
            pass

        order = _record_order(order_id, req, priced_items, total, "confirmed", None,
                               transaction_id=payment_result.get("transactionId"))
        await _notify(client, req, order, "order_confirmation")
        return order


def _record_order(order_id, req, priced_items, total, status, failure_reason, transaction_id=None):
    order = {
        "orderId": order_id,
        "userId": req.userId,
        "email": req.email,
        "items": priced_items,
        "total": round(total, 2),
        "status": status,
        "failureReason": failure_reason,
        "transactionId": transaction_id,
        "createdAt": int(time.time()),
    }
    orders_db.append(order)
    save_orders(orders_db)
    return order


async def _notify(client, req: CheckoutRequest, order, notif_type):
    if not req.email:
        return
    try:
        await client.post(f"{NOTIFICATION_URL}/notifications/notify", json={
            "type": notif_type,
            "to": req.email,
            "order": order,
        })
    except Exception:
        pass
