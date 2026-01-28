export interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice?: number;
  buyCost?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StoreProduct {
  id: string;
  price: number;
  stock: number;
  stockThreshold: number;
  createdAt: string;
  updatedAt: string;
  productId: string;
  product: Product;
  storeId: string;
  store?: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateStoreProductRequest {
  productId?: string;
  createNewProduct: boolean;
  name?: string;
  description?: string;
  basePrice?: number;
  buyCost?: number;
  storeId: string;
  price: number;
  stock: number;
  stockThreshold: number;
}

export interface StoreProductsResponse {
  // El backend devuelve un array directamente, no un objeto paginado
  // Usamos StoreProduct[] directamente
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface StoreProductListItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  buyCost?: number;
  basePrice?: number;
}

export interface StoreProductsListResponse {
  data: StoreProductListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CatalogProductLookupItem {
  id: string;
  name: string;
}

export interface StoreProductDetail {
  id: string;
  productId?: string;
  price: number;
  stock: number;
  product: {
    id?: string;
    name: string;
    description?: string;
    basePrice?: number;
    buyCost?: number;
  };
  store?: {
    name: string;
    address?: string;
    phone?: string;
  };
  user?: {
    name: string;
  };
}

export interface CatalogProductDeletePayload {
  email: string;
  password: string;
}

export interface StoreProductStockItem {
  id?: string;
  storeProductId?: string;
  productId?: string;
  name: string;
  stock: number;
}
