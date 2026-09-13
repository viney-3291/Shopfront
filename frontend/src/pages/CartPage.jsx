import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../CartContext.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function CartPage() {
  const { user } = useAuth();
  const { cart, refresh, removeItem } = useCart();
  const navigate = useNavigate();

  const [details, setDetails] = useState({}); // productId -> product
  const [country, setCountry] = useState("CA");
  const [shipping, setShipping] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        (cart.items || []).map(async (item) => {
          try {
            const p = await api.getProduct(item.productId);
            return [item.productId, p];
          } catch {
            return [item.productId, null];
          }
        })
      );
      setDetails(Object.fromEntries(entries));
    })();
  }, [cart]);

  const items = cart.items || [];
  const subtotal = items.reduce((sum, item) => {
    const p = details[item.productId];
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  const estimateShipping = async () => {
    try {
      const est = await api.estimateShipping({ country, weightKg: Math.max(1, items.length * 0.5) });
      setShipping(est);
    } catch (e) {
      setError(e.message);
    }
  };

  const checkout = async () => {
    setBusy(true);
    setError("");
    try {
      const order = await api.checkout({
        userId: user.id,
        email: user.email,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping: { country, weightKg: Math.max(1, items.length * 0.5) },
      });
      setResult(order);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <p>
        <Link to="/login">Log in</Link> to view your cart.
      </p>
    );
  }

  if (result) {
    return (
      <div className="order-result">
        <h2>{result.status === "confirmed" ? "Order confirmed 🎉" : "Order failed"}</h2>
        <p>Order ID: {result.orderId}</p>
        <p>Total: ${result.total?.toFixed(2)}</p>
        {result.status !== "confirmed" && <p className="error">Reason: {result.failureReason}</p>}
        {result.email && <p>A confirmation was sent to {result.email} — check MailHog at localhost:8025.</p>}
        <button onClick={() => navigate("/orders")}>View my orders</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Your Cart</h2>
      {items.length === 0 && <p>Your cart is empty.</p>}
      {items.map((item) => {
        const p = details[item.productId];
        return (
          <div key={item.productId} className="cart-row">
            {p && <img src={p.image} alt={p.name} />}
            <div className="cart-row-info">
              <strong>{p ? p.name : item.productId}</strong>
              <p>
                Qty: {item.quantity} {p && `× $${p.price.toFixed(2)}`}
              </p>
            </div>
            <button className="link-btn" onClick={() => removeItem(item.productId)}>
              Remove
            </button>
          </div>
        );
      })}

      {items.length > 0 && (
        <div className="cart-summary">
          <p>Subtotal: ${subtotal.toFixed(2)}</p>

          <div className="shipping-row">
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
              <option value="OTHER">International</option>
            </select>
            <button onClick={estimateShipping}>Estimate shipping</button>
          </div>
          {shipping && (
            <p>
              Shipping ({shipping.zone}): ${shipping.cost.toFixed(2)} — ETA {shipping.etaDays} days
            </p>
          )}

          {error && <p className="error">{error}</p>}
          <button disabled={busy} onClick={checkout} className="checkout-btn">
            {busy ? "Placing order..." : "Checkout"}
          </button>
        </div>
      )}
    </div>
  );
}
