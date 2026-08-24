import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function login(credentials) {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
    skipAuthRefresh: true,
  });

  return unwrapApiResponse(response);
}

export async function register(payload) {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: payload,
    skipAuthRefresh: true,
  });

  return unwrapApiResponse(response);
}

export async function refreshSession() {
  const response = await apiRequest("/auth/refresh", {
    method: "POST",
    skipAuthRefresh: true,
  });

  return unwrapApiResponse(response);
}

export async function logout() {
  await apiRequest("/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export async function logoutAll() {
  await apiRequest("/auth/logout-all", {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export async function changePassword(payload) {
  await apiRequest("/auth/change-password", {
    method: "PUT",
    body: payload,
  });
}

export async function getCurrentUser() {
  const response = await apiRequest("/users/me");

  return unwrapApiResponse(response);
}
