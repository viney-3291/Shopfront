import os
import random

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="recommendation-service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCT_URL = os.environ.get("PRODUCT_SERVICE_URL", "http://product-service:4002")


@app.get("/health")
def health():
    return {"status": "ok", "service": "recommendation-service"}


@app.get("/recommendations/{product_id}")
async def recommendations(product_id: str, limit: int = 3):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{PRODUCT_URL}/products")
            resp.raise_for_status()
            products = resp.json()
        except Exception:
            raise HTTPException(status_code=502, detail="product-service unavailable")

    current = next((p for p in products if p["id"] == product_id), None)
    if current is None:
        raise HTTPException(status_code=404, detail="product not found")

    same_category = [p for p in products if p["id"] != product_id and p["category"] == current["category"]]
    others = [p for p in products if p["id"] != product_id and p["category"] != current["category"]]

    random.shuffle(same_category)
    random.shuffle(others)
    picks = (same_category + others)[:limit]

    return {"productId": product_id, "recommendations": picks}
