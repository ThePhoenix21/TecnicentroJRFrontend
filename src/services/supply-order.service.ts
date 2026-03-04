import { domainApi } from "./domainApi";
import { api } from "./api";
import type {
  CreateSupplyOrderDto,
  ReceiveSupplyOrderDto,
  SupplyOrderDetail,
  SupplyOrderFilters,
  SupplyOrderListResponse,
  SupplyOrderLookupItem,
  ClosePartialSupplyOrderResponse,
} from "@/types/supply-order.types";

class SupplyOrderService {
  private baseUrl = "/supply-orders";

  private getDomainPath(path: string): { store: string; warehouse: string } {
    return {
      store: `${this.baseUrl}${path}`,
      warehouse: `/warehouse/receptions${path}`,
    };
  }

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
    const response = await domainApi.get<SupplyOrderListResponse>({
      store: query ? `${this.baseUrl}?${query}` : this.baseUrl,
      warehouse: query ? `/warehouse/receptions?${query}` : '/warehouse/receptions',
    });
    return response.data;
  }

  async getSupplyOrderById(orderId: string): Promise<SupplyOrderDetail> {
    const response = await domainApi.get<SupplyOrderDetail>(this.getDomainPath(`/${orderId}`));
    return response.data;
  }

  async annullSupplyOrder(orderId: string): Promise<void> {
    await domainApi.post(this.getDomainPath(`/${orderId}/annull`));
  }

  async approveSupplyOrder(orderId: string): Promise<void> {
    await domainApi.post(this.getDomainPath(`/${orderId}/approve`));
  }

  async receiveSupplyOrder(orderId: string, payload: ReceiveSupplyOrderDto): Promise<void> {
    await domainApi.post(this.getDomainPath(`/${orderId}/receive`), payload);
  }

  async closePartialSupplyOrder(orderId: string): Promise<ClosePartialSupplyOrderResponse> {
    const response = await domainApi.post<ClosePartialSupplyOrderResponse>(this.getDomainPath(`/${orderId}/close-partial`));
    return response.data;
  }

  async createSupplyOrder(payload: CreateSupplyOrderDto): Promise<string> {
    const response = await domainApi.post<string>(this.getDomainPath(''), payload);
    return response.data;
  }

  async updateSupplyOrder(orderId: string, payload: { description: string; storeId: string; products: any[] }): Promise<void> {
    await domainApi.put(this.getDomainPath(`/${orderId}`), payload);
  }

  async getSupplyOrdersLookup(): Promise<SupplyOrderLookupItem[]> {
    const params = new URLSearchParams();

    if (typeof window !== 'undefined') {
      try {
        const userRaw = localStorage.getItem('user');
        const activeLoginMode = userRaw
          ? (JSON.parse(userRaw) as { activeLoginMode?: string }).activeLoginMode
          : null;

        if (activeLoginMode === 'STORE') {
          const storeRaw = localStorage.getItem('current_store');
          if (storeRaw) {
            const store = JSON.parse(storeRaw) as { id?: string };
            if (store?.id) params.set('storeId', store.id);
          }
        } else if (activeLoginMode === 'WAREHOUSE') {
          const warehouseRaw = localStorage.getItem('current_warehouse');
          if (warehouseRaw) {
            const warehouse = JSON.parse(warehouseRaw) as { id?: string };
            if (warehouse?.id) params.set('warehouseId', warehouse.id);
          }
        }
      } catch {
        // ignore localStorage parse errors
      }
    }

    const qs = params.toString();
    const url = qs ? `/supply-orders/lookup?${qs}` : '/supply-orders/lookup';
    const response = await api.get<SupplyOrderLookupItem[]>(url);
    return response.data;
  }

  async approveSupplyOrderWithEmail(orderId: string, pdfBlob?: Blob): Promise<any> {
    if (pdfBlob) {
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `orden-${orderId}.pdf`);
      const response = await domainApi.post(this.getDomainPath(`/${orderId}/approve-with-email`), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      const response = await domainApi.post(this.getDomainPath(`/${orderId}/approve-with-email`));
      return response.data;
    }
  }
}

export const supplyOrderService = new SupplyOrderService();
