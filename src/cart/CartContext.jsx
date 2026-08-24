import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addCartItem,
  clearCart as clearCartRequest,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../api/cartApi";
import useAuth from "../auth/useAuth";
import CartContext from "./cartContext";

const EMPTY_CART = {
  cartId: null,
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

function normalizeCart(cart) {
  if (!cart) {
    return EMPTY_CART;
  }

  return {
    cartId: cart.cartId || null,
    items: Array.isArray(cart.items) ? cart.items : [],
    totalItems: Number.isInteger(cart.totalItems) ? cart.totalItems : 0,
    totalPrice: cart.totalPrice ?? 0,
  };
}

export function CartProvider({ children }) {
  const { isAuthenticated, status: authStatus, user } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const clearCartState = useCallback(() => {
    setCart(EMPTY_CART);
    setStatus("idle");
    setError("");
  }, []);

  const refreshCart = useCallback(async (options = {}) => {
    setStatus("loading");
    setError("");

    try {
      const nextCart = await getCart(options);
      const normalizedCart = normalizeCart(nextCart);

      setCart(normalizedCart);
      setStatus("success");
      return normalizedCart;
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        throw requestError;
      }

      setError("Cart could not be loaded right now.");
      setStatus("error");
      throw requestError;
    }
  }, []);

  useEffect(() => {
    if (authStatus === "loading") {
      return undefined;
    }

    if (!isAuthenticated) {
      let isCurrent = true;

      Promise.resolve().then(() => {
        if (isCurrent) {
          clearCartState();
        }
      });

      return () => {
        isCurrent = false;
      };
    }

    const controller = new AbortController();
    let isCurrent = true;

    Promise.resolve().then(() => {
      if (!isCurrent) {
        return;
      }

      refreshCart({ signal: controller.signal }).catch((requestError) => {
        if (requestError?.name === "AbortError") {
          return;
        }
      });
    });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [authStatus, clearCartState, isAuthenticated, refreshCart, user?.id]);

  const addItem = useCallback(async ({ productId, quantity }) => {
    const nextCart = await addCartItem({ productId, quantity });
    const normalizedCart = normalizeCart(nextCart);

    setCart(normalizedCart);
    setStatus("success");
    setError("");
    return normalizedCart;
  }, []);

  const updateItem = useCallback(async (productId, quantity) => {
    const nextCart = await updateCartItem(productId, { quantity });
    const normalizedCart = normalizeCart(nextCart);

    setCart(normalizedCart);
    setStatus("success");
    setError("");
    return normalizedCart;
  }, []);

  const removeItem = useCallback(async (productId) => {
    await removeCartItem(productId);
    return refreshCart();
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    await clearCartRequest();
    setCart(EMPTY_CART);
    setStatus("success");
    setError("");
    return EMPTY_CART;
  }, []);

  const visibleCart = isAuthenticated ? cart : EMPTY_CART;

  const value = useMemo(
    () => ({
      cart: visibleCart,
      error,
      itemCount: visibleCart.totalItems || 0,
      status,
      addItem,
      clearCart,
      clearCartState,
      refreshCart,
      removeItem,
      updateItem,
    }),
    [
      addItem,
      clearCart,
      clearCartState,
      error,
      refreshCart,
      removeItem,
      status,
      updateItem,
      visibleCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
