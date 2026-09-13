import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { CartProvider, useCart } from "./CartContext.jsx";
import Home from "./pages/Home.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import CartPage from "./pages/CartPage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Orders from "./pages/Orders.jsx";
import Status from "./pages/Status.jsx";

function NavBar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Shopfront
      </Link>
      <nav>
        <Link to="/cart">Cart{count > 0 ? ` (${count})` : ""}</Link>
        {user ? (
          <>
            <Link to="/orders">Orders</Link>
            <span className="hello">Hi, {user.name}</span>
            <button
              className="link-btn"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
        <Link to="/status" className="status-link">
          ● status
        </Link>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NavBar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/status" element={<Status />} />
          </Routes>
        </main>
      </CartProvider>
    </AuthProvider>
  );
}
