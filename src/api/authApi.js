import { API_BASE_URL, apiRequest, unwrapApiResponse } from "./apiClient";

function getBackendBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

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

export async function verifyEmail(token, options = {}) {
  const searchParams = new URLSearchParams({ token });
  const response = await apiRequest(`/auth/verify-email?${searchParams}`, {
    method: "GET",
    skipAuthRefresh: true,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function resendVerification(payload, options = {}) {
  const response = await apiRequest("/auth/resend-verification", {
    method: "POST",
    body: payload,
    skipAuthRefresh: true,
    ...options,
  });

  return unwrapApiResponse(response);
}

export function getGoogleOAuthUrl() {
  return `${getBackendBaseUrl()}/oauth2/authorization/google`;
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

export async function changePassword(payload, options = {}) {
  const response = await apiRequest("/auth/change-password", {
    method: "PUT",
    body: payload,
    ...options,
  });

  return unwrapApiResponse(response);
}

export async function getCurrentUser(options = {}) {
  const response = await apiRequest("/users/me", options);

  return unwrapApiResponse(response);
}
