// src/services/dashboard.service.ts
import { api } from '@/services/api';

export interface SalesSummary {
  total: number;
  count: number;
  average: number;
}

export interface ProductsSummary {
  total: number;
  lowStock: number;
}

export interface ServicesSummary {
  total: number;
  mostPopular: string;
}

export interface ClientsSummary {
  total: number;
  newThisMonth: number;
}

export interface RecentActivity {
  id: string;
  type: 'sale' | 'service';
  amount: number;
  status: string;
  description: string;
  customerName: string;
  userName?: string;
  itemsCount: number;
  createdAt: string;
  orderNumber?: string;
}

export interface TopProduct {
  id: string;
  name: string;
  value: number;
  price?: number;
  description?: string;
}

export interface DashboardStats {
  salesSummary: SalesSummary;
  productsSummary: ProductsSummary;
  servicesSummary: ServicesSummary;
  clientsSummary: ClientsSummary;
  recentSales: RecentActivity[];
  topProducts: TopProduct[];
}

export const dashboardService = {
  async getDashboardStats(storeId?: string): Promise<DashboardStats> {
    try {
      const params = storeId ? { storeId } : {};
      const response = await api.get<DashboardStats>('/dashboard/summary', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },
};
