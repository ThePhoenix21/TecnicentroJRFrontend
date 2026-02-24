import { useCallback, useMemo, useState } from "react";
import {
  getAnalyticsExpenses,
  getAnalyticsIncome,
  getAnalyticsIncomeTimeseries,
  getAnalyticsNetProfit,
  getAnalyticsOverview,
  getAnalyticsPaymentMethodsSummary,
  getAnalyticsUserRankings,
} from "@/api/analytics.api";
import { normalizeApiError, type ApiRequestError } from "@/api/common";
import { useAuth } from "@/contexts/auth-context";
import type {
  AnalyticsOverviewResponse,
  AnalyticsQueryParams,
  ExpensesResponse,
  IncomeResponse,
  IncomeTimeSeriesResponse,
  NetProfitResponse,
  PaymentMethodsSummaryResponse,
  UserRankingsResponse,
} from "@/types/analytics.types";

export function useAnalytics() {
  const { logout } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [incomeTimeseries, setIncomeTimeseries] = useState<IncomeTimeSeriesResponse | null>(null);
  const [income, setIncome] = useState<IncomeResponse | null>(null);
  const [netProfit, setNetProfit] = useState<NetProfitResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpensesResponse | null>(null);
  const [paymentMethodsSummary, setPaymentMethodsSummary] =
    useState<PaymentMethodsSummaryResponse | null>(null);
  const [userRankings, setUserRankings] = useState<UserRankingsResponse | null>(null);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [incomeTimeseriesLoading, setIncomeTimeseriesLoading] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [netProfitLoading, setNetProfitLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [userRankingsLoading, setUserRankingsLoading] = useState(false);

  const [overviewError, setOverviewError] = useState<ApiRequestError | null>(null);
  const [incomeTimeseriesError, setIncomeTimeseriesError] = useState<ApiRequestError | null>(null);
  const [incomeError, setIncomeError] = useState<ApiRequestError | null>(null);
  const [netProfitError, setNetProfitError] = useState<ApiRequestError | null>(null);
  const [expensesError, setExpensesError] = useState<ApiRequestError | null>(null);
  const [paymentMethodsError, setPaymentMethodsError] = useState<ApiRequestError | null>(null);
  const [userRankingsError, setUserRankingsError] = useState<ApiRequestError | null>(null);

  const fetchOverview = useCallback(async (params: AnalyticsQueryParams) => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getAnalyticsOverview(params);
      setOverview(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setOverviewError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setOverviewLoading(false);
    }
  }, [logout]);

  const fetchIncomeTimeseries = useCallback(async (params: AnalyticsQueryParams) => {
    setIncomeTimeseriesLoading(true);
    setIncomeTimeseriesError(null);
    try {
      const data = await getAnalyticsIncomeTimeseries(params);
      setIncomeTimeseries(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setIncomeTimeseriesError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setIncomeTimeseriesLoading(false);
    }
  }, [logout]);

  const fetchNetProfit = useCallback(async (params: AnalyticsQueryParams) => {
    setNetProfitLoading(true);
    setNetProfitError(null);
    try {
      const data = await getAnalyticsNetProfit(params);
      setNetProfit(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setNetProfitError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setNetProfitLoading(false);
    }
  }, [logout]);

  const fetchIncome = useCallback(async (params: AnalyticsQueryParams) => {
    setIncomeLoading(true);
    setIncomeError(null);
    try {
      const data = await getAnalyticsIncome(params);
      setIncome(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setIncomeError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setIncomeLoading(false);
    }
  }, [logout]);

  const fetchExpenses = useCallback(async (params: AnalyticsQueryParams) => {
    setExpensesLoading(true);
    setExpensesError(null);
    try {
      const data = await getAnalyticsExpenses(params);
      setExpenses(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setExpensesError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setExpensesLoading(false);
    }
  }, [logout]);

  const fetchPaymentMethodsSummary = useCallback(async (params: AnalyticsQueryParams) => {
    setPaymentMethodsLoading(true);
    setPaymentMethodsError(null);
    try {
      const data = await getAnalyticsPaymentMethodsSummary(params);
      setPaymentMethodsSummary(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setPaymentMethodsError(normalized);
      if (normalized.status === 429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [logout]);

  const fetchUserRankings = useCallback(async (params: AnalyticsQueryParams) => {
    setUserRankingsLoading(true);
    setUserRankingsError(null);
    try {
      const data = await getAnalyticsUserRankings(params);
      setUserRankings(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setUserRankingsError(normalized);
      if (normalized.status === 429) {
        setUserRankings(null);
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        logout();
      }
      throw normalized;
    } finally {
      setUserRankingsLoading(false);
    }
  }, [logout]);

  const fetchAnalytics = useCallback(
    async (params: AnalyticsQueryParams) => {
      setOverviewLoading(true);
      setIncomeTimeseriesLoading(true);
      setIncomeLoading(true);
      setNetProfitLoading(true);
      setExpensesLoading(true);
      setPaymentMethodsLoading(true);
      setUserRankingsLoading(true);

      setOverviewError(null);
      setIncomeTimeseriesError(null);
      setIncomeError(null);
      setNetProfitError(null);
      setExpensesError(null);
      setPaymentMethodsError(null);
      setUserRankingsError(null);

      const [
        overviewResult,
        incomeTimeseriesResult,
        incomeResult,
        netProfitResult,
        expensesResult,
        paymentMethodsResult,
        userRankingsResult,
      ] = await Promise.allSettled([
        getAnalyticsOverview(params),
        getAnalyticsIncomeTimeseries(params),
        getAnalyticsIncome(params),
        getAnalyticsNetProfit(params),
        getAnalyticsExpenses(params),
        getAnalyticsPaymentMethodsSummary(params),
        getAnalyticsUserRankings(params),
      ]);

      if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
      if (incomeTimeseriesResult.status === "fulfilled") setIncomeTimeseries(incomeTimeseriesResult.value);
      if (incomeResult.status === "fulfilled") setIncome(incomeResult.value);
      if (netProfitResult.status === "fulfilled") setNetProfit(netProfitResult.value);
      if (expensesResult.status === "fulfilled") setExpenses(expensesResult.value);
      if (paymentMethodsResult.status === "fulfilled") setPaymentMethodsSummary(paymentMethodsResult.value);
      if (userRankingsResult.status === "fulfilled") setUserRankings(userRankingsResult.value);

      if (overviewResult.status === "rejected") setOverviewError(normalizeApiError(overviewResult.reason));
      if (incomeTimeseriesResult.status === "rejected") {
        setIncomeTimeseriesError(normalizeApiError(incomeTimeseriesResult.reason));
      }
      if (incomeResult.status === "rejected") setIncomeError(normalizeApiError(incomeResult.reason));
      if (netProfitResult.status === "rejected") setNetProfitError(normalizeApiError(netProfitResult.reason));
      if (expensesResult.status === "rejected") setExpensesError(normalizeApiError(expensesResult.reason));
      if (paymentMethodsResult.status === "rejected") {
        setPaymentMethodsError(normalizeApiError(paymentMethodsResult.reason));
      }
      if (userRankingsResult.status === "rejected") {
        setUserRankingsError(normalizeApiError(userRankingsResult.reason));
      }

      // Check for 429 rate limit errors and clear states + logout
      const overviewErr = overviewResult.status === "rejected" ? normalizeApiError(overviewResult.reason) : null;
      const incomeTimeseriesErr = incomeTimeseriesResult.status === "rejected" ? normalizeApiError(incomeTimeseriesResult.reason) : null;
      const incomeErr = incomeResult.status === "rejected" ? normalizeApiError(incomeResult.reason) : null;
      const netProfitErr = netProfitResult.status === "rejected" ? normalizeApiError(netProfitResult.reason) : null;
      const expensesErr = expensesResult.status === "rejected" ? normalizeApiError(expensesResult.reason) : null;
      const paymentMethodsErr = paymentMethodsResult.status === "rejected" ? normalizeApiError(paymentMethodsResult.reason) : null;
      const userRankingsErr = userRankingsResult.status === "rejected" ? normalizeApiError(userRankingsResult.reason) : null;

      const has429 = [overviewErr, incomeTimeseriesErr, incomeErr, netProfitErr, expensesErr, paymentMethodsErr, userRankingsErr].some(err => err?.status === 429);

      if (has429) {
        setOverview(null);
        setIncomeTimeseries(null);
        setIncome(null);
        setNetProfit(null);
        setExpenses(null);
        setPaymentMethodsSummary(null);
        setUserRankings(null);
        setOverviewError(null);
        setIncomeTimeseriesError(null);
        setIncomeError(null);
        setNetProfitError(null);
        setExpensesError(null);
        setPaymentMethodsError(null);
        setUserRankingsError(null);
        logout();
      }

      setOverviewLoading(false);
      setIncomeTimeseriesLoading(false);
      setIncomeLoading(false);
      setNetProfitLoading(false);
      setExpensesLoading(false);
      setPaymentMethodsLoading(false);
      setUserRankingsLoading(false);

      return {
        overview:
          overviewResult.status === "fulfilled" ? overviewResult.value : (null as AnalyticsOverviewResponse | null),
        incomeTimeseries:
          incomeTimeseriesResult.status === "fulfilled"
            ? incomeTimeseriesResult.value
            : (null as IncomeTimeSeriesResponse | null),
        income: incomeResult.status === "fulfilled" ? incomeResult.value : (null as IncomeResponse | null),
        netProfit:
          netProfitResult.status === "fulfilled" ? netProfitResult.value : (null as NetProfitResponse | null),
        expenses: expensesResult.status === "fulfilled" ? expensesResult.value : (null as ExpensesResponse | null),
        paymentMethodsSummary:
          paymentMethodsResult.status === "fulfilled"
            ? paymentMethodsResult.value
            : (null as PaymentMethodsSummaryResponse | null),
        userRankings:
          userRankingsResult.status === "fulfilled" ? userRankingsResult.value : (null as UserRankingsResponse | null),
      };
    },
    [logout]
  );

  const loading = useMemo(
    () =>
      overviewLoading ||
      incomeTimeseriesLoading ||
      incomeLoading ||
      netProfitLoading ||
      expensesLoading ||
      paymentMethodsLoading ||
      userRankingsLoading,
    [
      overviewLoading,
      incomeTimeseriesLoading,
      incomeLoading,
      netProfitLoading,
      expensesLoading,
      paymentMethodsLoading,
      userRankingsLoading,
    ]
  );

  return {
    overview,
    incomeTimeseries,
    income,
    netProfit,
    expenses,
    paymentMethodsSummary,
    userRankings,
    overviewLoading,
    incomeTimeseriesLoading,
    incomeLoading,
    netProfitLoading,
    expensesLoading,
    paymentMethodsLoading,
    userRankingsLoading,
    loading,
    overviewError,
    incomeTimeseriesError,
    incomeError,
    netProfitError,
    expensesError,
    paymentMethodsError,
    userRankingsError,
    fetchOverview,
    fetchIncomeTimeseries,
    fetchIncome,
    fetchNetProfit,
    fetchExpenses,
    fetchPaymentMethodsSummary,
    fetchUserRankings,
    fetchAnalytics,
  };
}
