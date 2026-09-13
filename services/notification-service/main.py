import os
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="notification-service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMAIL_URL = os.environ.get("EMAIL_SERVICE_URL", "http://email-service:4011")


class NotifyRequest(BaseModel):
    type: str
    to: str
    order: Optional[Dict[str, Any]] = None


TEMPLATES = {
    "order_confirmation": lambda order: (
        f"Your order {order.get('orderId')} is confirmed!",
        f"Thanks for your order! Total charged: ${order.get('total')}. "
        f"We'll let you know when it ships.",
    ),
    "order_failed": lambda order: (
        f"There was a problem with order {order.get('orderId')}",
        f"We couldn't complete your order. Reason: {order.get('failureReason')}. "
        f"No charge was made, feel free to try again.",
    ),
}


@app.get("/health")
def health():
    return {"status": "ok", "service": "notification-service"}


@app.post("/notifications/notify")
async def notify(req: NotifyRequest):
    order = req.order or {}
    builder = TEMPLATES.get(req.type)
    if builder:
        subject, text = builder(order)
    else:
        subject, text = f"Update on your account", "You have a new notification."

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{EMAIL_URL}/send", json={"to": req.to, "subject": subject, "text": text})
            sent = resp.status_code < 300
        except Exception:
            sent = False

    return {"notified": sent, "type": req.type, "to": req.to}
