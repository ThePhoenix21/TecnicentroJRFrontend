"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "@/hooks/useDashboard";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { AnalyticsQueryParams, PaymentType } from "@/types/analytics.types";
import type { DashboardQueryParams } from "@/types/dashboard.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "dashboard" | "analytics";

type ChartRow = Record<string, unknown>;

type GenericChart = {
  type: "line" | "pie" | "bar";
  xKey?: string;
  yKeys?: string[];
  yLabels?: string[];
  series: ChartRow[];
};

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getThisMonthRange() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toInputDate(start), to: toInputDate(tomorrow) };
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toStringSafe(value: unknown, fallback = "-"): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function deltaClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-muted-foreground";
  return value >= 0 ? "text-emerald-600" : "text-red-600";
}

function deltaBadgeVariant(value: number | null | undefined): "secondary" | "destructive" {
  return value !== null && value !== undefined && value < 0 ? "destructive" : "secondary";
}

function DeltaPctBadge({ value }: { value: number | null | undefined }) {
  const Icon = value !== null && value !== undefined && value < 0 ? TrendingDown : TrendingUp;
  return (
    <Badge variant={deltaBadgeVariant(value)} className={deltaClass(value)}>
      <Icon className="mr-1 h-3 w-3" />
      {value === null || value === undefined ? "N/A" : `${value.toFixed(2)}%`}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DynamicLineChart({ chart }: { chart: GenericChart }) {
  const xKey = chart.xKey ?? "date";
  const yKeys = chart.yKeys ?? [];
  const yLabels = chart.yLabels ?? yKeys;
  const series = chart.series;
  const maxValue = Math.max(
    1,
    ...series.flatMap((row) => yKeys.map((key) => toNumber(row[key])))
  );

  if (series.length === 0 || yKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay datos para el gráfico.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {series.map((row, index) => (
          <div key={`${toStringSafe(row[xKey], String(index))}-${index}`}>
            <p className="mb-1 text-xs text-muted-foreground">{toStringSafe(row[xKey])}</p>
            <div className="space-y-1">
              {yKeys.map((key, keyIndex) => {
                const value = toNumber(row[key]);
                const width = Math.max(3, (value / maxValue) * 100);
                const label = yLabels[keyIndex] || key;
                return (
                  <div key={`${key}-${index}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span>{label === "Ingreso total" ? formatCurrency(value) : value.toLocaleString("es-PE")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={keyIndex % 2 === 0 ? "h-2 rounded-full bg-primary" : "h-2 rounded-full bg-cyan-600"}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPieLabel(row: ChartRow): string {
  return (
    toStringSafe(row.label, "") ||
    toStringSafe(row.type, "") ||
    toStringSafe(row.name, "") ||
    "Sin etiqueta"
  );
}

function getPieValue(row: ChartRow): number {
  return toNumber(row.value ?? row.total ?? row.quantity ?? row.count);
}

function DynamicPieChart({ chart }: { chart: GenericChart }) {
  const normalized = chart.series.map((row) => ({
    label: getPieLabel(row),
    value: getPieValue(row),
  }));
  const total = normalized.reduce((acc, item) => acc + item.value, 0);

  if (normalized.length === 0 || total <= 0) {
    return <p className="text-sm text-muted-foreground">No hay datos para el gráfico.</p>;
  }

  const colors = ["#0ca12dff", "#170bc5ff", "#c501dfff", "#84cc16", "#f59e0b", "#ef4444", "#8b5cf6", "#a5c522ff"];
  let cursor = 0;
  const gradientParts = normalized.map((item, index) => {
    const start = cursor;
    const slice = (item.value / total) * 100;
    cursor += slice;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div className="mx-auto h-40 w-40 rounded-full" style={{ background: `conic-gradient(${gradientParts.join(", ")})` }} />
      <div className="space-y-2">
        {normalized.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{item.label}</span>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(item.value)}</p>
              <p className="text-xs text-muted-foreground">{((item.value / total) * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DynamicBarChart({ chart }: { chart: GenericChart }) {
  const xKey = chart.xKey ?? "name";
  const yKey = chart.yKeys?.[0];

  if (!yKey || chart.series.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay datos para el gráfico.</p>;
  }

  const maxValue = Math.max(1, ...chart.series.map((row) => toNumber(row[yKey])));

  return (
    <div className="space-y-2">
      {chart.series.map((row, index) => {
        const value = toNumber(row[yKey]);
        const width = Math.max(4, (value / maxValue) * 100);
        return (
          <div key={`${toStringSafe(row[xKey], String(index))}-${index}`}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{toStringSafe(row[xKey])}</span>
              <span className="font-medium">{value.toLocaleString("es-PE")}</span>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DynamicChart({ chart }: { chart: GenericChart }) {
  if (chart.type === "line") return <DynamicLineChart chart={chart} />;
  if (chart.type === "pie") return <DynamicPieChart chart={chart} />;
  if (chart.type === "bar") return <DynamicBarChart chart={chart} />;
  return <p className="text-sm text-muted-foreground">Tipo de gráfico no soportado.</p>;
}

function ComparisonCard({
  title,
  deltaValue,
  deltaPctValue,
  formatter,
}: {
  title: string;
  deltaValue: number | null | undefined;
  deltaPctValue: number | null | undefined;
  formatter?: (v: number) => string;
}) {
  const safeDelta = deltaValue ?? 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className={`text-2xl font-bold ${deltaClass(deltaValue)}`}>
          {formatter ? formatter(safeDelta) : safeDelta.toLocaleString("es-PE")}
        </p>
        <DeltaPctBadge value={deltaPctValue} />
      </CardContent>
    </Card>
  );
}

function EndpointErrorAlerts({
  errors,
}: {
  errors: Array<{ key: string; title: string; message: string }>;
}) {
  if (errors.length === 0) return null;
  return (
    <div className="space-y-2">
      {errors.map((entry) => (
        <Alert key={entry.key} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{entry.title}</AlertTitle>
          <AlertDescription>{entry.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { currentStore } = useAuth();
  const dashboard = useDashboard();
  const analytics = useAnalytics();
  const {
    summary,
    charts,
    loading: dashboardLoading,
    summaryError,
    chartsError,
    fetchDashboard,
  } = dashboard;
  const {
    overview,
    incomeTimeseries,
    income,
    netProfit,
    expenses,
    paymentMethodsSummary,
    loading: analyticsLoading,
    overviewError,
    incomeError,
    netProfitError,
    expensesError,
    paymentMethodsError,
    fetchAnalytics,
  } = analytics;

  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compareFrom, setCompareFrom] = useState("");
  const [compareTo, setCompareTo] = useState("");

  useEffect(() => {
    const range = getThisMonthRange();
    setFrom(range.from);
    setTo(range.to);
  }, []);

  const commonParams = useMemo(() => {
    const params: AnalyticsQueryParams = {
      from,
      to,
      storeId: currentStore?.id,
    };
    if (compareFrom) params.compareFrom = compareFrom;
    if (compareTo) params.compareTo = compareTo;
    return params;
  }, [from, to, currentStore?.id, compareFrom, compareTo]);

  const loadDashboard = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      const params: DashboardQueryParams = { ...commonParams, storeId: currentStore.id };
      await fetchDashboard(params);
    } catch {
      toast.error("No se pudo cargar Panel de control.");
    }
  }, [currentStore?.id, fetchDashboard, commonParams]);

  const loadAnalytics = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      await fetchAnalytics(commonParams);
    } catch {
      toast.error("No se pudieron cargar Analí­ticas.");
    }
  }, [fetchAnalytics, commonParams, currentStore?.id]);

  useEffect(() => {
    if (!from || !to || !currentStore?.id) return;
    void loadDashboard();
    void loadAnalytics();
  }, [from, to, currentStore?.id, loadDashboard, loadAnalytics]);

  const canRefresh = Boolean(from && to && currentStore?.id);
  const dashboardErrors = [
    summaryError
      ? { key: "summary", title: "Error en /dashboard/summary", message: summaryError.message }
      : null,
    chartsError
      ? { key: "charts", title: "Error en /dashboard/charts", message: chartsError.message }
      : null,
  ].filter((item): item is { key: string; title: string; message: string } => item !== null);

  const analyticsErrors = [
    overviewError
      ? { key: "overview", title: "Error en /analytics/overview", message: overviewError.message }
      : null,
    incomeError
      ? { key: "income", title: "Error en /analytics/income", message: incomeError.message }
      : null,
    netProfitError
      ? { key: "net-profit", title: "Error en /analytics/net-profit", message: netProfitError.message }
      : null,
    expensesError
      ? { key: "expenses", title: "Error en /analytics/expenses", message: expensesError.message }
      : null,
    paymentMethodsError
      ? {
          key: "payment-methods",
          title: "Error en /analytics/payment-methods-summary",
          message: paymentMethodsError.message,
        }
      : null,
  ].filter((item): item is { key: string; title: string; message: string } => item !== null);

  
  

  const salesTrendChart: GenericChart | null = charts
    ? {
        type: charts.charts.salesTrend.type,
        xKey: charts.charts.salesTrend.xKey,
        yKeys: charts.charts.salesTrend.yKeys,
        yLabels: ["Ingreso total", "Cantidad de ventas"],
        series: charts.charts.salesTrend.series,
      }
    : null;

  const paymentMethodsChart: GenericChart | null = charts
    ? {
        type: charts.charts.paymentMethods.type,
        series: charts.charts.paymentMethods.series.map((item) => ({
          label: item.type as PaymentType,
          value: item.total,
          count: item.count,
        })),
      }
    : null;

  const topProductsChart: GenericChart | null = charts
    ? {
        type: charts.charts.topProducts.type,
        xKey: charts.charts.topProducts.xKey,
        yKeys: charts.charts.topProducts.yKeys,
        series: charts.charts.topProducts.series,
      }
    : null;

  const analyticsIncomeTrend: GenericChart | null = overview
    ? {
        type: overview.charts.incomeTrend.chart.type,
        xKey: overview.charts.incomeTrend.chart.xKey,
        yKeys: overview.charts.incomeTrend.chart.yKeys,
        series: overview.charts.incomeTrend.series,
      }
    : incomeTimeseries
      ? {
          type: incomeTimeseries.chart.type,
          xKey: incomeTimeseries.chart.xKey,
          yKeys: incomeTimeseries.chart.yKeys,
          series: incomeTimeseries.series,
        }
      : null;

  const analyticsPaymentsChart: GenericChart | null = overview
    ? {
        type: overview.charts.paymentMethods.chart.type,
        series: overview.charts.paymentMethods.chart.series,
      }
    : paymentMethodsSummary
      ? {
          type: paymentMethodsSummary.chart.type,
          series: paymentMethodsSummary.chart.series,
        }
      : null;

  const allLoading = dashboardLoading || analyticsLoading;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de control</h1>
          <p className="text-sm text-muted-foreground">Datos en tiempo real desde contrato oficial.</p>
        </div>
      </div>

      {!currentStore?.id ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Selecciona una tienda</AlertTitle>
          <AlertDescription>Debes seleccionar una tienda para cargar panel de control y analíticas.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Panel de control</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <div className="flex gap-2 items-end">
          <div>
            <label className="text-sm font-medium">Desde</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Hasta</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {/* <Input type="date" value={compareFrom} onChange={(e) => setCompareFrom(e.target.value)} />
          <Input type="date" value={compareTo} onChange={(e) => setCompareTo(e.target.value)} /> */}
          <div>
            <label className="text-sm font-medium invisible">Actualizar</label>
            <Button
              variant="outline"
              onClick={() => {
                void loadDashboard();
                void loadAnalytics();
              }}
              disabled={!canRefresh || allLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${allLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <EndpointErrorAlerts errors={dashboardErrors} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ventas Totales"
              value={formatCurrency(summary?.kpis.salesTotal ?? 0)}
              description={`Ventas: ${(summary?.kpis.salesCount ?? 0).toLocaleString("es-PE")}`}
              loading={dashboardLoading}
            />
            <StatCard
              title="Ticket Promedio"
              value={formatCurrency(summary?.kpis.salesAverage ?? 0)}
              description="Promedio por venta"
              loading={dashboardLoading}
            />
            <StatCard
              title="Clientes"
              value={(summary?.kpis.clientsTotal ?? 0).toLocaleString("es-PE")}
              description={`Nuevos: ${(summary?.kpis.newClientsThisMonth ?? 0).toLocaleString("es-PE")}`}
              loading={dashboardLoading}
            />
            <StatCard
              title="Productos con bajo stock"
              value={(summary?.kpis.productsLowStock ?? 0).toLocaleString("es-PE")}
              description="Necesitan reposición"
              loading={dashboardLoading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Gráfico principal: Ventas</CardTitle>
              </CardHeader>
              <CardContent>{salesTrendChart ? <DynamicChart chart={salesTrendChart} /> : <Skeleton className="h-56" />}</CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodsChart ? <DynamicChart chart={paymentMethodsChart} /> : <Skeleton className="h-56" />}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top productos</CardTitle>
            </CardHeader>
            <CardContent>{topProductsChart ? <DynamicChart chart={topProductsChart} /> : <Skeleton className="h-56" />}</CardContent>
          </Card>

          {/* {summary?.comparison ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Bloque comparativo</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <ComparisonCard
                  title="Delta Total"
                  deltaValue={summary.comparison.delta.total}
                  deltaPctValue={summary.comparison.deltaPct.total}
                  formatter={(v) => formatCurrency(v)}
                />
                <ComparisonCard
                  title="Delta Cantidad"
                  deltaValue={summary.comparison.delta.count}
                  deltaPctValue={summary.comparison.deltaPct.count}
                />
                <ComparisonCard
                  title="Delta Promedio"
                  deltaValue={summary.comparison.delta.average}
                  deltaPctValue={summary.comparison.deltaPct.average}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
            </div>
          ) : null} */}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <EndpointErrorAlerts errors={analyticsErrors} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ingreso Total"
              value={formatCurrency(overview?.kpis.totalIncome ?? 0)}
              loading={analyticsLoading}
            />
            <StatCard
              title="Egresos Totales"
              value={formatCurrency(overview?.kpis.totalExpenses ?? 0)}
              loading={analyticsLoading}
            />
            <StatCard
              title="Ganancia Neta"
              value={formatCurrency(overview?.kpis.netProfit ?? 0)}
              loading={analyticsLoading}
            />
            <StatCard
              title="Transacciones"
              value={(overview?.kpis.transactions ?? 0).toLocaleString("es-PE")}
              loading={analyticsLoading}
            />
          </div>

          {/* <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle>Income Trend</CardTitle>
              </CardHeader>
              <CardContent>{analyticsIncomeTrend ? <DynamicChart chart={analyticsIncomeTrend} /> : <Skeleton className="h-56" />}</CardContent>
            </Card>
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Payment Methods (Pie)</CardTitle>
              </CardHeader>
              <CardContent>{analyticsPaymentsChart ? <DynamicChart chart={analyticsPaymentsChart} /> : <Skeleton className="h-56" />}</CardContent>
            </Card>
          </div> */}

          {/* {netProfit?.comparison ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Comparativo net-profit</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <ComparisonCard
                  title="Total ingreso"
                  deltaValue={netProfit.comparison.delta.totalIncome}
                  deltaPctValue={netProfit.comparison.deltaPct.totalIncome}
                  formatter={(v) => formatCurrency(v)}
                />
                <ComparisonCard
                  title="Total egresos"
                  deltaValue={netProfit.comparison.delta.totalExpenses}
                  deltaPctValue={netProfit.comparison.deltaPct.totalExpenses}
                  formatter={(v) => formatCurrency(v)}
                />
                <ComparisonCard
                  title="Utilidad neta"
                  deltaValue={netProfit.comparison.delta.netProfit}
                  deltaPctValue={netProfit.comparison.deltaPct.netProfit}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
            </div>
          ) : null}

          {income?.comparison ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Comparativo income</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <ComparisonCard
                  title="Productos"
                  deltaValue={income.comparison.delta.incomeProducts}
                  deltaPctValue={income.comparison.deltaPct.incomeProducts}
                  formatter={(v) => formatCurrency(v)}
                />
                <ComparisonCard
                  title="Servicios"
                  deltaValue={income.comparison.delta.incomeServices}
                  deltaPctValue={income.comparison.deltaPct.incomeServices}
                  formatter={(v) => formatCurrency(v)}
                />
                <ComparisonCard
                  title="Total income"
                  deltaValue={income.comparison.delta.totalIncome}
                  deltaPctValue={income.comparison.deltaPct.totalIncome}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
            </div>
          ) : null}

          {expenses?.comparison ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Comparativo expenses</h3>
              <div className="grid gap-4 md:grid-cols-1">
                <ComparisonCard
                  title="Total expenses"
                  deltaValue={expenses.comparison.delta.totalExpenses}
                  deltaPctValue={expenses.comparison.deltaPct.totalExpenses}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
            </div>
          ) : null} */}

          <Card>
            <CardHeader>
              <CardTitle>Línea de tiempo de ingresos y egresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(netProfit?.timeline ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No hay movimientos para este rango.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (netProfit?.timeline ?? []).map((item) => (
                        <TableRow key={`${item.sourceId}-${item.date}`}>
                          <TableCell>{new Date(item.date).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.type === "INCOME" ? "secondary" : "destructive"}
                              className={item.type === "INCOME" ? "bg-green-500 text-white hover:bg-green-600" : ""}
                            >
                              {item.type === "INCOME" ? "Ingreso" : "Egreso"}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.concept}</TableCell>
                          <TableCell>
                            {item.source === "PAYMENT_METHOD" ? "Pago de orden" : "Movimiento de caja"}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
