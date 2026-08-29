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

export async function getProductInventoryTransactions(
  productId,
  params = {},
  options = {},
) {
  const query = buildQuery(params);
  const response = await apiRequest(
    `/admin/inventory/products/${encodeURIComponent(productId)}/transactions${
      query ? `?${query}` : ""
    }`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function adjustProductStock(productId, payload, options = {}) {
  const response = await apiRequest(
    `/products/${encodeURIComponent(productId)}/stock-adjustments`,
    {
      method: "POST",
      body: payload,
      ...options,
    },
  );

  return unwrapApiResponse(response);
}
