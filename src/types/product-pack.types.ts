export interface ProductPackLookupItem {
  id: string;
  name: string;
}

export interface ProductPackItem {
  id?: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    description?: string;
  };
}

export interface ProductPack {
  id: string;
  name: string;
  description?: string | null;
  fixedPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  items: ProductPackItem[];
}

export interface ProductPackPreviewItem {
  productId: string;
  productName: string;
  quantity: number;
  storeProductId?: string | null;
  stock?: number | null;
  requiredStock?: number | null;
  remainingStock?: number | null;
  hasStockIssue?: boolean;
}

export interface ProductPackPreview {
  packId: string;
  storeId: string;
  hasStockIssues: boolean;
  items: ProductPackPreviewItem[];
}

export interface ProductPackListItem {
  id: string;
  name: string;
  description?: string | null;
  fixedPrice: number;
  isActive: boolean;
  itemsCount: number;
  items?: ProductPackItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPackListResponse {
  data: ProductPackListItem[];
  total: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateProductPackDto {
  name: string;
  description?: string;
  fixedPrice: number;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export type UpdateProductPackDto = Partial<CreateProductPackDto>;

export interface OrderPackSnapshotComponent {
  productId?: string;
  name: string;
  quantity: number;
}

export interface OrderPack {
  id: string;
  packId?: string;
  name: string;
  quantity: number;
  basePriceSnapshot: number;
  soldPrice: number;
  subtotal: number;
  components: OrderPackSnapshotComponent[];
}
