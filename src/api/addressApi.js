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

export async function updateShippingAddress(addressId, payload, options = {}) {
  const response = await apiRequest(`/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function setDefaultShippingAddress(addressId, options = {}) {
  const response = await apiRequest(
    `/addresses/${encodeURIComponent(addressId)}/default`,
    {
      method: "PUT",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function deleteShippingAddress(addressId, options = {}) {
  const response = await apiRequest(`/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    ...options,
  });

  return unwrapApiResponse(response);
}
