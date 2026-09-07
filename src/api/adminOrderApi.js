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

export async function getAdminOrders(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(
    `/admin/orders${query ? `?${query}` : ""}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function getAdminOrderById(orderId, options = {}) {
  const response = await apiRequest(
    `/admin/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function updateAdminOrderStatus(orderId, status, options = {}) {
  const response = await apiRequest(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "PUT",
      body: { status },
      ...options,
    },
  );

  return unwrapApiResponse(response);
}
