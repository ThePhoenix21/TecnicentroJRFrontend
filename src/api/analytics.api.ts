import { api } from "@/services/api";
import {
  type AnalyticsOverviewResponse,
  type AnalyticsQueryParams,
  type ExpensesResponse,
  type IncomeResponse,
  type IncomeTimeSeriesResponse,
  type NetProfitResponse,
  type PaymentMethodsSummaryResponse,
} from "@/types/analytics.types";
import { buildQueryParams, validateCompareRange, validateRequiredRange } from "@/api/common";

function validateAnalyticsParams(params: AnalyticsQueryParams, endpoint: string): void {
  validateCompareRange(params);
  validateRequiredRange(params, endpoint);
}

export async function getAnalyticsOverview(
  params: AnalyticsQueryParams
): Promise<AnalyticsOverviewResponse> {
  validateAnalyticsParams(params, "/analytics/overview");
  const response = await api.get<AnalyticsOverviewResponse>("/analytics/overview", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getAnalyticsIncomeTimeseries(
  params: AnalyticsQueryParams
): Promise<IncomeTimeSeriesResponse> {
  validateAnalyticsParams(params, "/analytics/income-timeseries");
  const response = await api.get<IncomeTimeSeriesResponse>("/analytics/income-timeseries", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getAnalyticsNetProfit(
  params: AnalyticsQueryParams
): Promise<NetProfitResponse> {
  validateAnalyticsParams(params, "/analytics/net-profit");
  const response = await api.get<NetProfitResponse>("/analytics/net-profit", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getAnalyticsIncome(params: AnalyticsQueryParams): Promise<IncomeResponse> {
  validateAnalyticsParams(params, "/analytics/income");
  const response = await api.get<IncomeResponse>("/analytics/income", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getAnalyticsPaymentMethodsSummary(
  params: AnalyticsQueryParams
): Promise<PaymentMethodsSummaryResponse> {
  validateAnalyticsParams(params, "/analytics/payment-methods-summary");
  const response = await api.get<PaymentMethodsSummaryResponse>(
    "/analytics/payment-methods-summary",
    {
      params: buildQueryParams(params),
    }
  );
  return response.data;
}

export async function getAnalyticsExpenses(
  params: AnalyticsQueryParams
): Promise<ExpensesResponse> {
  validateAnalyticsParams(params, "/analytics/expenses");
  const response = await api.get<ExpensesResponse>("/analytics/expenses", {
    params: buildQueryParams(params),
  });
  return response.data;
}
