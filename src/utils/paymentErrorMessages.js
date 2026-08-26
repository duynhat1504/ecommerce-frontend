const PAYMENT_ERROR_MESSAGES = [
  {
    test: (message) => message === "Order not found",
    message: "This order is unavailable or cannot be paid from this account.",
  },
  {
    test: (message) => message === "Order has already been paid",
    message: "This order has already been paid.",
  },
  {
    test: (message) => message === "Cancelled order cannot be paid",
    message: "Cancelled orders cannot be paid.",
  },
  {
    test: (message) => message === "Only pending orders can be paid",
    message: "Only pending orders can be paid.",
  },
  {
    test: (message) => message === "Idempotency-Key has already been used for another order",
    message: "This payment attempt cannot be reused for another order.",
  },
  {
    test: (message) => message === "Validation failed",
    message: "The payment request is incomplete.",
  },
];

export function getPaymentErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again to continue payment.";
  }

  const backendMessage = error?.message || "";
  const matchedMessage = PAYMENT_ERROR_MESSAGES.find(({ test }) =>
    test(backendMessage),
  );

  if (matchedMessage) {
    return matchedMessage.message;
  }

  if (error?.status >= 500) {
    return "Payment service is unavailable right now.";
  }

  return fallback;
}

export function isUnconfirmedPaymentError(error) {
  return !error?.status && error?.name !== "AbortError";
}
