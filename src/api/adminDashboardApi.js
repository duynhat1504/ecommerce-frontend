import { apiRequest, unwrapApiResponse } from "./apiClient";

export async function getAdminDashboardSummary(options = {}) {
  const response = await apiRequest("/admin/dashboard/summary", {
    method: "GET",
    ...options,
  });

  return unwrapApiResponse(response);
}
