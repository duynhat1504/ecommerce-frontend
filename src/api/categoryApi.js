import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getCategories(options = {}) {
  const response = await apiRequest("/categories", {
    includeAuth: false,
    skipAuthRefresh: true,
    ...options,
  });

  return unwrapApiResponse(response);
}
