const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

let accessToken = null;
let refreshHandler = null;
let unauthorizedHandler = null;
let refreshRequest = null;

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function setApiAccessToken(token) {
  accessToken = token || null;
}

export function setApiRefreshHandler(handler) {
  refreshHandler = handler;
}

export function setApiUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function clearApiSession() {
  accessToken = null;
  refreshRequest = null;
}

export function unwrapApiResponse(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }

  return response;
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(body, headers = {}, includeAuth = true) {
  const requestHeaders = new Headers(headers);

  if (includeAuth && accessToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return requestHeaders;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function refreshAccessToken() {
  if (!refreshHandler) {
    throw new ApiError("No refresh handler is configured.", { status: 401 });
  }

  if (!refreshRequest) {
    refreshRequest = refreshHandler().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function apiRequest(path, options = {}) {
  const {
    body,
    headers,
    includeAuth = true,
    skipAuthRefresh = false,
    retryOnUnauthorized = true,
    ...requestOptions
  } = options;

  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...requestOptions,
    headers: buildHeaders(body, headers, includeAuth),
    body:
      body !== undefined && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body,
  });

  const parsedResponse = await parseResponse(response);

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    retryOnUnauthorized &&
    refreshHandler
  ) {
    try {
      await refreshAccessToken();
      return apiRequest(path, {
        body,
        headers,
        includeAuth,
        skipAuthRefresh: true,
        retryOnUnauthorized: false,
        ...requestOptions,
      });
    } catch (error) {
      clearApiSession();
      unauthorizedHandler?.(error);
    }
  }

  if (!response.ok) {
    const message =
      parsedResponse?.message ||
      parsedResponse?.error ||
      "The request could not be completed.";

    throw new ApiError(message, {
      status: response.status,
      data: parsedResponse,
    });
  }

  return parsedResponse;
}
