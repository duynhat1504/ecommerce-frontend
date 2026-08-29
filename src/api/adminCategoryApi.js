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

export async function getAdminCategories(params = {}, options = {}) {
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

export async function getAdminCategoryById(categoryId, options = {}) {
  const response = await apiRequest(
    `/admin/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function createAdminCategory(payload, options = {}) {
  const response = await apiRequest("/categories", {
    method: "POST",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function updateAdminCategory(categoryId, payload, options = {}) {
  const response = await apiRequest(
    `/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PUT",
      body: payload,
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function deleteAdminCategory(categoryId, options = {}) {
  const response = await apiRequest(
    `/admin/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "DELETE",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}
