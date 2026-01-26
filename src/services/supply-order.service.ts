import { api } from "./api";
import type {
  CreateSupplyOrderDto,
  ReceiveSupplyOrderDto,
  SupplyOrderDetail,
  SupplyOrderFilters,
  SupplyOrderListResponse,
} from "@/types/supply-order.types";

class SupplyOrderService {
  private baseUrl = "/supply-orders";

  async getSupplyOrders(filters: SupplyOrderFilters = {}): Promise<SupplyOrderListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    if (filters.status) params.set("status", filters.status);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);

    const query = params.toString();
    const url = query ? `${this.baseUrl}?${query}` : this.baseUrl;
    const response = await api.get<SupplyOrderListResponse>(url);
    return response.data;
  }

  async getSupplyOrderById(orderId: string): Promise<SupplyOrderDetail> {
    const response = await api.get<SupplyOrderDetail>(`${this.baseUrl}/${orderId}`);
    return response.data;
  }

  async annullSupplyOrder(orderId: string): Promise<void> {
    await api.post(`${this.baseUrl}/${orderId}/annull`);
  }

  async approveSupplyOrder(orderId: string): Promise<void> {
    await api.post(`${this.baseUrl}/${orderId}/approve`);
  }

  async receiveSupplyOrder(orderId: string, payload: ReceiveSupplyOrderDto): Promise<void> {
    await api.post(`${this.baseUrl}/${orderId}/receive`, payload);
  }

  async createSupplyOrder(payload: CreateSupplyOrderDto): Promise<string> {
    const response = await api.post<string>(this.baseUrl, payload);
    return response.data;
  }
}

export const supplyOrderService = new SupplyOrderService();
