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

export async function getProducts(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(`/products${query ? `?${query}` : ""}`, {
    includeAuth: false,
    skipAuthRefresh: true,
    ...options,
  });

  return unwrapApiResponse(response);
}
