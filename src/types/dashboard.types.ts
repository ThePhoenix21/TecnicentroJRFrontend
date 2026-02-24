import type { PaymentType } from "@/types/analytics.types";

export interface DashboardSummaryResponse {
  salesSummary: {
    total: number;
    count: number;
    average: number;
  };
  productsSummary: {
    total: number;
    lowStock: number;
  };
  servicesSummary: {
    total: number;
    mostPopular: string | null;
  };
  clientsSummary: {
    total: number;
    newThisMonth: number;
  };
  recentSales: Array<{
    id: string;
    type: "sale";
    amount: number;
    status: string;
    description: string;
    customerName: string;
    userName: string;
    itemsCount: number;
    createdAt: string;
    orderNumber: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    value: number;
    price: number;
    description: string;
  }>;
  charts: {
    salesTrend: Array<{
      date: string;
      total: number;
      count: number;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      value: number;
      price: number;
      description: string;
    }>;
  };
  kpis: {
    salesTotal: number;
    salesCount: number;
    salesAverage: number;
    clientsTotal: number;
    newClientsThisMonth: number;
    productsLowStock: number;
  };
  comparison?: {
    current: { total: number; count: number; average: number };
    previous: { total: number; count: number; average: number };
    delta: { total: number; count: number; average: number };
    deltaPct: { total: number | null; count: number | null; average: number | null };
  };
  filters: {
    from: string | null;
    to: string | null;
    compareFrom: string | null;
    compareTo: string | null;
    timeZone: string | null;
    storeId: string | null;
  };
}

export interface DashboardChartsResponse {
  range: {
    from: string;
    to: string;
    timeZone: string | null;
    storeId: string | null;
  };
  charts: {
    salesTrend: {
      type: "line";
      xKey: "date";
      yKeys: ["total", "count"];
      series: Array<{
        date: string;
        total: number;
        count: number;
      }>;
    };
    paymentMethods: {
      type: "pie";
      series: Array<{
        type: PaymentType;
        total: number;
        count: number;
      }>;
    };
    topProducts: {
      type: "bar";
      xKey: "name";
      yKeys: ["quantity"];
      series: Array<{
        productId: string;
        name: string;
        quantity: number;
      }>;
    };
    topServices: {
      type: "bar";
      xKey: "name";
      yKeys: ["count"];
      series: Array<{
        name: string;
        count: number;
      }>;
    };
  };
}

export interface DashboardQueryParams {
  from?: string;
  to?: string;
  timeZone?: string;
  storeId?: string;
  compareFrom?: string;
  compareTo?: string;
}
