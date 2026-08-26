import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function createMockPayment({ orderId, success }, idempotencyKey, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await apiRequest("/payments", {
    method: "POST",
    body: {
      orderId,
      method: "MOCK",
      success,
    },
    headers: {
      ...(headers || {}),
      "Idempotency-Key": idempotencyKey,
    },
    ...requestOptions,
  });

  return unwrapApiResponse(response);
}
