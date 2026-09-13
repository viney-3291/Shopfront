import random
import uuid
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="payment-service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock gateway: fails on purpose if the amount ends in .13 (easy to trigger for demos),
# otherwise succeeds ~92% of the time to simulate occasional real-world declines.
FAILURE_RATE = 0.08


class ChargeRequest(BaseModel):
    orderId: str
    amount: float
    cardLast4: Optional[str] = "4242"


@app.get("/health")
def health():
    return {"status": "ok", "service": "payment-service"}


@app.post("/payments/charge")
def charge(req: ChargeRequest):
    if req.amount <= 0:
        return {"status": "failed", "reason": "invalid amount"}

    force_fail = round(req.amount % 1, 2) == 0.13
    if force_fail or random.random() < FAILURE_RATE:
        return {
            "status": "failed",
            "reason": "card declined by issuing bank (simulated)",
            "orderId": req.orderId,
        }

    return {
        "status": "success",
        "transactionId": "txn_" + uuid.uuid4().hex[:12],
        "orderId": req.orderId,
        "amount": req.amount,
    }
