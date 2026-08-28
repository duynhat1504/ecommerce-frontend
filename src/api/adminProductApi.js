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

export async function getAdminProducts(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(
    `/admin/products${query ? `?${query}` : ""}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function getAdminProductById(productId, options = {}) {
  const response = await apiRequest(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function createAdminProduct(payload, options = {}) {
  const response = await apiRequest("/products", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function updateAdminProduct(productId, payload, options = {}) {
  const response = await apiRequest(
    `/products/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      body: payload,
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function deleteAdminProduct(productId, options = {}) {
  const response = await apiRequest(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function getAdminProductCategories(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(
    `/admin/categories${query ? `?${query}` : ""}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}
