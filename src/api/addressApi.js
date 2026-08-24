import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getShippingAddresses(options = {}) {
  const response = await apiRequest("/addresses", {
    method: "GET",
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function createShippingAddress(payload, options = {}) {
  const response = await apiRequest("/addresses", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}
