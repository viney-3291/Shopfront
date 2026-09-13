import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Status() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    api.health().then(setHealth).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>System Status</h2>
      <p>Auto-refreshes every 5s. This calls each service's own /health endpoint through the gateway.</p>
      {error && <p className="error">{error}</p>}
      {health && (
        <div className="status-grid">
          {Object.entries(health.services).map(([name, state]) => (
            <div key={name} className={`status-pill ${state}`}>
              <span className="dot" /> {name}: {state}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
