const BASE = "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  // Don't trust the Content-Type header alone — some backends omit it even
  // when the body is valid JSON. Try to parse JSON regardless, and only
  // fall back to null if the body genuinely isn't JSON (e.g. empty body).
  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message = (data && (data.error || data.detail)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // products / search
  getProducts: () => request("/products"),
  getProduct: (id) => request(`/products/${id}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  getRecommendations: (id) => request(`/recommendations/${id}`),

  // reviews
  getReviews: (productId) => request(`/reviews/${productId}`),
  addReview: (productId, body) =>
    request(`/reviews/${productId}`, { method: "POST", body: JSON.stringify(body) }),

  // auth
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  // cart
  getCart: (userId) => request(`/cart/${userId}`),
  addToCart: (userId, item) =>
    request(`/cart/${userId}`, { method: "POST", body: JSON.stringify(item) }),
  removeFromCart: (userId, productId) =>
    request(`/cart/${userId}/${productId}`, { method: "DELETE" }),

  // shipping
  estimateShipping: (body) => request("/shipping/estimate", { method: "POST", body: JSON.stringify(body) }),

  // checkout
  checkout: (body) => request("/orders/checkout", { method: "POST", body: JSON.stringify(body) }),
  getUserOrders: (userId) => request(`/orders/user/${userId}`),

  // gateway health
  health: () => request("/health"),
};
