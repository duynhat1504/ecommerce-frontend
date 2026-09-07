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

export async function getAdminUsers(params = {}, options = {}) {
  const query = buildQuery(params);
  const response = await apiRequest(
    `/admin/users${query ? `?${query}` : ""}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function getAdminUserById(userId, options = {}) {
  const response = await apiRequest(
    `/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function updateAdminUserStatus(userId, active, options = {}) {
  const response = await apiRequest(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PUT",
      body: { active },
      ...options,
    },
  );

  return unwrapApiResponse(response);
}

export async function updateAdminUserRole(userId, role, options = {}) {
  const response = await apiRequest(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: "PUT",
      body: { role },
      ...options,
    },
  );

  return unwrapApiResponse(response);
}
