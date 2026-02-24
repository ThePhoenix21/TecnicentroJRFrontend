export type SupplyOrderStatus =
  | "ISSUED"
  | "PENDING"
  | "PARTIAL"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED"
  | "ANNULLATED";

export interface SupplyOrderItem {
  id: string;
  code: string;
  status: SupplyOrderStatus;
  createdAt: string;
  providerName?: string | null;
  storeName?: string | null;
  warehouseName?: string | null;
  creatorUser?: string | null;
  creatorUserEmail?: string | null;
}

export interface SupplyOrderListResponse {
  data: SupplyOrderItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface SupplyOrderUserInfo {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  username?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  accessProfileId?: string | null;
}

export interface SupplyOrderProviderInfo {
  id: string;
  name: string;
  ruc?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface SupplyOrderStoreInfo {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface SupplyOrderWarehouseInfo {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface SupplyOrderProductInfo {
  id: string;
  productId: string;
  quantity: number;
  note?: string | null;
  product?: {
    id: string;
    name: string;
  } | null;
}

export interface SupplyOrderReceptionProductInfo {
  id: string;
  productId: string;
  quantity: number;
  createdAt?: string | null;
}

export interface SupplyOrderReceptionCreatedByInfo {
  id: string;
  name: string;
  email?: string | null;
}

export interface SupplyOrderReceptionInfo {
  id: string;
  receivedAt: string;
  reference?: string | null;
  notes?: string | null;
  createdBy?: SupplyOrderReceptionCreatedByInfo | null;
  products: SupplyOrderReceptionProductInfo[];
}

export interface SupplyOrderDetail {
  id: string;
  code: string;
  status: SupplyOrderStatus;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  providerId: string;
  createdById: string;
  warehouseId?: string | null;
  storeId?: string | null;
  createdBy?: SupplyOrderUserInfo | null;
  provider?: SupplyOrderProviderInfo | null;
  store?: SupplyOrderStoreInfo | null;
  warehouse?: SupplyOrderWarehouseInfo | null;
  products: SupplyOrderProductInfo[];
  warehouseReceptions: SupplyOrderReceptionInfo[];
  storeReceptions: SupplyOrderReceptionInfo[];
}

export interface SupplyOrderFilters {
  page?: number;
  pageSize?: number;
  status?: SupplyOrderStatus;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  code?: string;
}

export interface CreateSupplyOrderProductDto {
  productId: string;
  quantity: number;
  note?: string | null;
}

export interface CreateSupplyOrderDto {
  providerId: string;
  storeId?: string;
  warehouseId?: string;
  description?: string | null;
  products: CreateSupplyOrderProductDto[];
}

export interface ReceiveSupplyOrderBatchDto {
  quantity: number;
  productionDate?: string | Date;
  expirationDate?: string | Date;
}

export interface ReceiveSupplyOrderProductDto {
  productId: string;
  quantity: number;
  batches?: ReceiveSupplyOrderBatchDto[];
}

export interface ReceiveSupplyOrderDto {
  reference?: string | null;
  notes?: string | null;
  closePartial?: boolean;
  products: ReceiveSupplyOrderProductDto[];
}

export interface SupplyOrderLookupItem {
  id: string;
  code: string;
}

export interface ClosePartialPendingProductInfo {
  productId: string;
  name: string;
  ordered: number;
  received: number;
  remaining: number;
}

export interface ClosePartialSupplyOrderResponse {
  success: boolean;
  pendingProducts: ClosePartialPendingProductInfo[];
}
