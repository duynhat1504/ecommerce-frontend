import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getCart(options = {}) {
  const response = await apiRequest("/cart", {
    method: "GET",
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function addCartItem(payload, options = {}) {
  const response = await apiRequest("/cart/items", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function updateCartItem(productId, payload, options = {}) {
  const response = await apiRequest(`/cart/items/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function removeCartItem(productId, options = {}) {
  await apiRequest(`/cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    ...options,
  });
}

export async function clearCart(options = {}) {
  await apiRequest("/cart", {
    method: "DELETE",
    ...options,
  });
}
