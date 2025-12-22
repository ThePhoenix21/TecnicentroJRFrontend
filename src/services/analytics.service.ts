import { api } from "@/services/api";

export type AnalyticsRange = {
  from: string;
  to: string;
};

export type NetProfitTimelineItem = {
  date: string;
  type: "INCOME" | "EXPENSE";
  concept: string;
  amount: number;
};

export type NetProfitResponse = {
  timeline: NetProfitTimelineItem[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
};

export type AnalyticsIncomeRankingItem = {
  userId: string;
  userName: string;
  userEmail?: string;
  servicesCount?: number;
  productsCount?: number;
  totalAmount?: number;
  total?: number;
};

export type AnalyticsIncomeResponse = {
  summary: {
    incomeProducts?: number;
    incomeServices?: number;
    totalIncome?: number;
  };
  rankings: {
    topUsersServices?: AnalyticsIncomeRankingItem[];
    topUsersProducts?: AnalyticsIncomeRankingItem[];
  };
  meta?: {
    hasProducts?: boolean;
    hasServices?: boolean;
  };
};

export type AnalyticsExpenseItem = {
  date: string;
  description: string;
  amount: number;
  expenseType?: string;
  source?: string;
  sourceId?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
};

export type AnalyticsExpensesResponse = {
  totals?: {
    totalExpenses?: number;
  };
  expenses: AnalyticsExpenseItem[];
};

class AnalyticsService {
  async getNetProfit(range: AnalyticsRange): Promise<NetProfitResponse> {
    const response = await api.get<NetProfitResponse>("/analytics/net-profit", {
      params: { from: range.from, to: range.to },
    });
    return response.data;
  }

  async getIncome(range: AnalyticsRange): Promise<AnalyticsIncomeResponse> {
    const response = await api.get<AnalyticsIncomeResponse>("/analytics/income", {
      params: { from: range.from, to: range.to },
    });
    return response.data;
  }

  async getExpenses(range: AnalyticsRange): Promise<AnalyticsExpensesResponse> {
    const response = await api.get<AnalyticsExpensesResponse>("/analytics/expenses", {
      params: { from: range.from, to: range.to },
    });
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
