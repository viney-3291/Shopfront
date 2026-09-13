import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.getUserOrders(user.id).then(setOrders).catch((e) => setError(e.message));
  }, [user]);

  if (!user) {
    return (
      <p>
        <Link to="/login">Log in</Link> to see your orders.
      </p>
    );
  }

  return (
    <div>
      <h2>Your Orders</h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders
        .slice()
        .reverse()
        .map((o) => (
          <div key={o.orderId} className={`order-card ${o.status}`}>
            <div className="order-card-header">
              <strong>{o.orderId}</strong>
              <span className={`badge ${o.status}`}>{o.status}</span>
            </div>
            <ul>
              {o.items.map((it) => (
                <li key={it.productId}>
                  {it.name} × {it.quantity} — ${it.lineTotal.toFixed(2)}
                </li>
              ))}
            </ul>
            <p>Total: ${o.total.toFixed(2)}</p>
            {o.failureReason && <p className="error">Reason: {o.failureReason}</p>}
          </div>
        ))}
    </div>
  );
}
