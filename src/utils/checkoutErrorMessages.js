const CHECKOUT_ERROR_MESSAGES = [
  {
    test: (message) => message === "Cart is empty",
    message: "Your cart is empty. Add products before placing an order.",
  },
  {
    test: (message) => message === "Shipping address not found",
    message: "Choose another shipping address or add a new one.",
  },
  {
    test: (message) => message.includes("Insufficient stock"),
    message: "Some items no longer have enough stock. Review your cart and try again.",
  },
  {
    test: (message) => message.includes("Product is not available"),
    message: "Some items are no longer available. Review your cart before ordering.",
  },
  {
    test: (message) => message.includes("Product category is not available"),
    message: "Some items are no longer available. Review your cart before ordering.",
  },
  {
    test: (message) => message.includes("One or more products"),
    message: "Some cart items changed. Review your cart before ordering.",
  },
  {
    test: (message) => message === "Validation failed",
    message: "Check the required fields and try again.",
  },
];

export function getCheckoutErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again to continue checkout.";
  }

  const backendMessage = error?.message || "";
  const matchedMessage = CHECKOUT_ERROR_MESSAGES.find(({ test }) =>
    test(backendMessage),
  );

  if (matchedMessage) {
    return matchedMessage.message;
  }

  if (error?.status >= 500) {
    return "Checkout is unavailable right now. Please try again later.";
  }

  return fallback;
}
