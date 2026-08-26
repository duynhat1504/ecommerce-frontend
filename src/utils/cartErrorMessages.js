const DOMAIN_ERROR_MESSAGES = new Map([
  ["Requested quantity exceeds available stock", "Requested quantity exceeds available stock."],
  ["Product is out of stock", "This product is out of stock."],
  ["Product is not active", "This product is not available."],
  ["Product category is not available", "This product is not available."],
  ["Product not found", "This product is no longer available."],
  ["Cart not found", "Your cart could not be found. Refresh and try again."],
  ["Cart item not found", "This item is no longer in your cart."],
  ["Validation failed", "Check the quantity and try again."],
]);

export function getCartErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again to continue with your cart.";
  }

  if (DOMAIN_ERROR_MESSAGES.has(error?.message)) {
    return DOMAIN_ERROR_MESSAGES.get(error.message);
  }

  if (error?.status >= 500) {
    return "Cart service is unavailable right now. Please try again.";
  }

  return fallback;
}
