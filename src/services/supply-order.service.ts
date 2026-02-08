import { api } from "./api";
import type {
  CreateSupplyOrderDto,
  ReceiveSupplyOrderDto,
  SupplyOrderDetail,
  SupplyOrderFilters,
  SupplyOrderListResponse,
  SupplyOrderLookupItem,
} from "@/types/supply-order.types";

class SupplyOrderService {
  private baseUrl = "/supply-orders";

  async getSupplyOrders(filters: SupplyOrderFilters = {}): Promise<SupplyOrderListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    if (filters.status) params.set("status", filters.status);
    if (filters.createdBy) params.set("createdBy", filters.createdBy);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    if (filters.code) params.set("code", filters.code);

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

  async updateSupplyOrder(orderId: string, payload: { description: string; storeId: string; products: any[] }): Promise<void> {
    await api.put(`${this.baseUrl}/${orderId}`, payload);
  }

  async getSupplyOrdersLookup(): Promise<SupplyOrderLookupItem[]> {
    const response = await api.get<SupplyOrderLookupItem[]>(`${this.baseUrl}/lookup`);
    return response.data;
  }

  async approveSupplyOrderWithEmail(orderId: string, pdfBlob?: Blob): Promise<any> {
    if (pdfBlob) {
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `orden-${orderId}.pdf`);
      const response = await api.post(`${this.baseUrl}/${orderId}/approve-with-email`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      const response = await api.post(`${this.baseUrl}/${orderId}/approve-with-email`);
      return response.data;
    }
  }
}

export const supplyOrderService = new SupplyOrderService();
