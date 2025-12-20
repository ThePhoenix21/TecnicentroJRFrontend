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
