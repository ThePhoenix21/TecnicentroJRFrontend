export type PaymentType =
  | "EFECTIVO"
  | "TARJETA"
  | "TRANSFERENCIA"
  | "YAPE"
  | "PLIN"
  | "DATAPHONE"
  | "BIZUM"
  | "OTRO";

export type MovementType = "INCOME" | "EXPENSE";

export interface IncomeTimeSeriesResponse {
  summary: {
    totalIncome: number;
    totalOrders: number;
    points: number;
  };
  series: Array<{
    date: string;
    totalIncome: number;
    ordersCount: number;
  }>;
  chart: {
    type: "line";
    xKey: "date";
    yKeys: ["totalIncome", "ordersCount"];
  };
}

export interface TopUserProducts {
  userId: string;
  userName: string;
  userEmail: string;
  itemsSold: number;
  totalAmount: number;
}

export interface TopUserServicesByUser {
  userId: string;
  userName: string;
  servicesCount: number;
  totalAmount: number;
}

export interface TopServiceByName {
  Name: string;
  Description: string;
  servicesCount: number;
  totalAmount: number;
}

export interface TotalUsersServicesItem {
  userId: string;
  userName: string;
  Name: string;
  Description: string;
  Amount: number;
}

export interface IncomeResponse {
  summary: {
    incomeProducts: number;
    incomeServices: number;
    totalIncome: number;
  };
  rankings:
    | {
        topUsersServices: Array<TopUserServicesByUser | TopServiceByName>;
        topUsersProducts: TopUserProducts[];
      }
    | {
        TotalUsersServices: TotalUsersServicesItem[];
        topUsersProducts: TopUserProducts[];
      };
  meta: {
    hasProducts: boolean;
    hasServices: boolean;
  };
  comparison?: {
    current: { incomeProducts: number; incomeServices: number; totalIncome: number };
    previous: { incomeProducts: number; incomeServices: number; totalIncome: number };
    delta: { incomeProducts: number; incomeServices: number; totalIncome: number };
    deltaPct: {
      incomeProducts: number | null;
      incomeServices: number | null;
      totalIncome: number | null;
    };
  };
}

export interface PaymentMethodsSummaryResponse {
  summary: {
    totalAmount: number;
    totalCount: number;
    methodsCount: number;
  };
  methods: Array<{
    type: PaymentType;
    totalAmount: number;
    count: number;
  }>;
  chart: {
    type: "pie";
    series: Array<{
      label: PaymentType;
      value: number;
      count: number;
    }>;
  };
}

export interface NetProfitResponse {
  totals: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
  timeline: Array<{
    date: string;
    type: MovementType;
    concept: string;
    amount: number;
    source: "PAYMENT_METHOD" | "CASH_MOVEMENT";
    sourceId: string;
    paymentMethod?: PaymentType;
  }>;
  comparison?: {
    current: { totalIncome: number; totalExpenses: number; netProfit: number };
    previous: { totalIncome: number; totalExpenses: number; netProfit: number };
    delta: { totalIncome: number; totalExpenses: number; netProfit: number };
    deltaPct: {
      totalIncome: number | null;
      totalExpenses: number | null;
      netProfit: number | null;
    };
  };
}

export interface ExpensesResponse {
  totals: {
    totalExpenses: number;
  };
  expenses: Array<{
    date: string;
    user: {
      id?: string;
      name?: string;
      email?: string;
    };
    description: string;
    amount: number;
    expenseType: PaymentType;
    source: "CASH_MOVEMENT";
    sourceId: string;
  }>;
  comparison?: {
    current: { totalExpenses: number };
    previous: { totalExpenses: number };
    delta: { totalExpenses: number };
    deltaPct: { totalExpenses: number | null };
  };
}

export interface AnalyticsOverviewResponse {
  kpis: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    transactions: number;
  };
  charts: {
    incomeTrend: IncomeTimeSeriesResponse;
    paymentMethods: PaymentMethodsSummaryResponse;
  };
  blocks: {
    income: IncomeResponse;
    expenses: ExpensesResponse;
    netProfit: NetProfitResponse;
  };
  filters: {
    from: string;
    to: string;
    compareFrom: string | null;
    compareTo: string | null;
    timeZone: string | null;
    storeId: string | null;
  };
}

export interface AnalyticsQueryParams {
  from?: string;
  to?: string;
  timeZone?: string;
  storeId?: string;
  compareFrom?: string;
  compareTo?: string;
}
