import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getCategories() {
  const response = await apiRequest("/categories", {
    includeAuth: false,
    skipAuthRefresh: true,
  });

  return unwrapApiResponse(response);
}
