import { api } from "@/services/api";
import {
  type DashboardChartsResponse,
  type DashboardQueryParams,
  type DashboardSummaryResponse,
} from "@/types/dashboard.types";
import { buildQueryParams, validateCompareRange, validateRequiredRange } from "@/api/common";

export async function getDashboardSummary(
  params: DashboardQueryParams
): Promise<DashboardSummaryResponse> {
  validateCompareRange(params);
  const response = await api.get<DashboardSummaryResponse>("/dashboard/summary", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getDashboardCharts(
  params: DashboardQueryParams
): Promise<DashboardChartsResponse> {
  validateCompareRange(params);
  validateRequiredRange(params, "/dashboard/charts");
  const response = await api.get<DashboardChartsResponse>("/dashboard/charts", {
    params: buildQueryParams(params),
  });
  return response.data;
}
