import { api } from './api';

export enum StockTransferStatus {
  ISSUED = 'ISSUED',
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  PARTIAL = 'PARTIAL',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  ANNULLATED = 'ANNULLATED',
}

export type StockTransferType = 'REQUEST' | 'SEND';

export interface StockTransferEstablishment {
  type: 'STORE' | 'WAREHOUSE';
  id: string;
  name: string;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  productName?: string;
  product?: {
    id?: string;
    name?: string;
  };
  quantityRequested: number;
  quantityReceived: number | null;
}

export interface StockTransferDetail {
  id: string;
  code: string;
  status: StockTransferStatus;
  transferType: StockTransferType;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  origin: StockTransferEstablishment;
  destination: StockTransferEstablishment;
  items: StockTransferItem[];
  confirmedBy: { id: string; name: string } | null;
  cancelledBy: { id: string; name: string } | null;
}

export interface StockTransferListItem {
  id: string;
  code: string;
  status: StockTransferStatus;
  transferType: StockTransferType;
  createdAt: string;
  origin: StockTransferEstablishment;
  destination: StockTransferEstablishment;
  createdBy: { id: string; name: string };
  itemCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateStockTransferDto {
  transferType: StockTransferType;
  originType: 'STORE' | 'WAREHOUSE';
  originStoreId?: string;
  originWarehouseId?: string;
  destinationType: 'STORE' | 'WAREHOUSE';
  destinationStoreId?: string;
  destinationWarehouseId?: string;
  notes?: string;
  items: { productId: string; quantityRequested: number }[];
}

export interface ReceiveStockTransferDto {
  items: { stockTransferProductId: string; quantityReceived: number }[];
  closePartial?: boolean;
}

export interface UpdateStockTransferDto {
  destinationType?: 'STORE' | 'WAREHOUSE';
  destinationStoreId?: string;
  destinationWarehouseId?: string;
  notes?: string;
  items?: { productId: string; quantityRequested: number }[];
}

export interface ProductLookupItem {
  id: string;
  name: string;
  sku?: string;
}

class StockTransferService {
  private baseUrl = '/stock-transfers';

  async list(params: {
    storeId?: string;
    warehouseId?: string;
    status?: string;
    code?: string;
    name?: string;
    userId?: string;
    userName?: string;
    fromDate?: string;
    toDate?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResponse<StockTransferListItem>> {
    const response = await api.get<PaginatedResponse<StockTransferListItem>>(
      this.baseUrl,
      { params }
    );
    return response.data;
  }

  async getById(id: string): Promise<StockTransferDetail> {
    const response = await api.get<StockTransferDetail>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(dto: CreateStockTransferDto): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(this.baseUrl, dto);
    return response.data;
  }

  async confirm(id: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/confirm`);
    return response.data;
  }

  async accept(id: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/accept`);
    return response.data;
  }

  async receive(id: string, dto: ReceiveStockTransferDto): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/receive`, dto);
    return response.data;
  }

  async closePartial(id: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/close-partial`);
    return response.data;
  }

  async annul(id: string, cancelReason: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`${this.baseUrl}/${id}/annul`, { cancelReason });
    return response.data;
  }

  async update(id: string, dto: UpdateStockTransferDto): Promise<{ success: boolean }> {
    const response = await api.patch<{ success: boolean }>(`${this.baseUrl}/${id}`, dto);
    return response.data;
  }

  async getStoreProductsSimpleLookup(storeId: string): Promise<ProductLookupItem[]> {
    const response = await api.get<Array<{ id?: string; name?: string; sku?: string }>>(
      '/catalog/products/lookup-sku'
    );
    const payload = Array.isArray(response.data) ? response.data : [];
    return payload
      .map((item) => {
        const productId = item.id;
        const name = item.name;
        if (!productId || !name) return null;
        const sku = item.sku;
        return sku ? { id: productId, name, sku } : { id: productId, name };
      })
      .filter((item): item is ProductLookupItem => Boolean(item));
  }

  async getWarehouseProductsSimpleLookup(warehouseId: string): Promise<ProductLookupItem[]> {
    const response = await api.get<Array<{ id?: string; name?: string; sku?: string }>>(
      '/catalog/products/lookup-sku'
    );
    const payload = Array.isArray(response.data) ? response.data : [];
    return payload
      .map((item) => {
        const productId = item.id;
        const name = item.name;
        if (!productId || !name) return null;
        const sku = item.sku;
        return sku ? { id: productId, name, sku } : { id: productId, name };
      })
      .filter((item): item is ProductLookupItem => Boolean(item));
  }
}

export const stockTransferService = new StockTransferService();
