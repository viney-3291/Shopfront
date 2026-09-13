import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const runSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const results = query.trim() ? await api.search(query.trim()) : await api.getProducts();
      setProducts(results || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="search-bar" onSubmit={runSearch}>
        <input
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <Link to={`/product/${p.id}`} key={p.id} className="card">
              <img src={p.image} alt={p.name} />
              <div className="card-body">
                <h3>{p.name}</h3>
                <p className="category">{p.category}</p>
                <p className="price">${p.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
          {products.length === 0 && <p>No products found.</p>}
        </div>
      )}
    </div>
  );
}
