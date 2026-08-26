import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function createOrder(payload, options = {}) {
  const response = await apiRequest("/orders", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function getOrderById(orderId, options = {}) {
  const response = await apiRequest(`/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    ...options,
  });

  return unwrapApiResponse(response);
}
