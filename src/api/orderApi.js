import { apiRequest, unwrapApiResponse } from "./apiClient";

function buildQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

export async function createOrder(payload, options = {}) {
  const response = await apiRequest("/orders", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function getMyOrders(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(`/orders${query ? `?${query}` : ""}`, {
    method: "GET",
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
