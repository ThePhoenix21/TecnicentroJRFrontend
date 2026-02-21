"use client";

import { useCallback, useMemo, useState } from "react";
import { getDashboardCharts, getDashboardSummary } from "@/api/dashboard.api";
import { normalizeApiError, type ApiRequestError } from "@/api/common";
import type { DashboardChartsResponse, DashboardQueryParams, DashboardSummaryResponse } from "@/types/dashboard.types";

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [charts, setCharts] = useState<DashboardChartsResponse | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);

  const [summaryError, setSummaryError] = useState<ApiRequestError | null>(null);
  const [chartsError, setChartsError] = useState<ApiRequestError | null>(null);

  const fetchSummary = useCallback(async (params: DashboardQueryParams) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await getDashboardSummary(params);
      setSummary(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setSummaryError(normalized);
      throw normalized;
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchCharts = useCallback(async (params: DashboardQueryParams) => {
    setChartsLoading(true);
    setChartsError(null);
    try {
      const data = await getDashboardCharts(params);
      setCharts(data);
      return data;
    } catch (error) {
      const normalized = normalizeApiError(error);
      setChartsError(normalized);
      throw normalized;
    } finally {
      setChartsLoading(false);
    }
  }, []);

  const fetchDashboard = useCallback(
    async (params: DashboardQueryParams) => {
      setSummaryLoading(true);
      setChartsLoading(true);
      setSummaryError(null);
      setChartsError(null);

      try {
        const [summaryData, chartsData] = await Promise.all([
          getDashboardSummary(params),
          getDashboardCharts(params),
        ]);
        setSummary(summaryData);
        setCharts(chartsData);
        return { summary: summaryData, charts: chartsData };
      } catch (error) {
        const normalized = normalizeApiError(error);
        setSummaryError(normalized);
        setChartsError(normalized);
        throw normalized;
      } finally {
        setSummaryLoading(false);
        setChartsLoading(false);
      }
    },
    []
  );

  const loading = useMemo(() => summaryLoading || chartsLoading, [summaryLoading, chartsLoading]);

  return {
    summary,
    charts,
    summaryLoading,
    chartsLoading,
    loading,
    summaryError,
    chartsError,
    fetchSummary,
    fetchCharts,
    fetchDashboard,
  };
}
