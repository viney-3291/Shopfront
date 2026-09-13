import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "./api.js";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });

  const refresh = useCallback(async () => {
    if (!user) {
      setCart({ items: [] });
      return;
    }
    try {
      const data = await api.getCart(user.id);
      setCart(data);
    } catch {
      setCart({ items: [] });
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      if (!user) throw new Error("please log in first");
      const data = await api.addToCart(user.id, { productId, quantity });
      setCart(data);
    },
    [user]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (!user) return;
      const data = await api.removeFromCart(user.id, productId);
      setCart(data);
    },
    [user]
  );

  const count = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, count, refresh, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
