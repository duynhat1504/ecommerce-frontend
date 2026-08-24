export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getBackendFieldErrors(error) {
  const errors = error?.data?.errors;

  if (!errors || typeof errors !== "object") {
    return {};
  }

  return errors;
}

export function getSafeRedirect(value, fallback = "/account") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (/^\/(?:login|register|verify-email|oauth2\/callback)(?:[/?#]|$)/.test(value)) {
    return fallback;
  }

  return value;
}

export function getRedirectFromLocation(location, searchParams) {
  const stateFrom = location.state?.from;

  if (stateFrom?.pathname) {
    return getSafeRedirect(
      `${stateFrom.pathname}${stateFrom.search || ""}${stateFrom.hash || ""}`,
    );
  }

  return getSafeRedirect(searchParams.get("redirect"));
}
