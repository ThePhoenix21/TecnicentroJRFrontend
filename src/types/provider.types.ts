export interface ProviderListItem {
  id: string;
  name: string;
  address: string;
  ruc: string;
  createdAt: string;
}

export interface ProviderCreatedBy {
  id: string;
  email: string;
  name: string;
}

export interface ProviderProductItem {
  id: string;
  buyCost: number | null;
  product: {
    id: string;
    name: string;
    description: string;
  };
}

export interface ProviderDetail {
  id: string;
  name: string;
  ruc: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: ProviderCreatedBy;
  providerProducts: ProviderProductItem[];
  supplyOrders: any[];
}

export interface UpdateProviderDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CreateProviderDto {
  ruc: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CreateProviderResponse {
  id: string;
  name: string;
  ruc: string;
}

export interface SaveProviderProductsResponse {
  success: boolean;
}

export interface ProductLookupItem {
  id: string;
  name: string;
}

export interface ProviderLookupItem {
  id: string;
  name: string;
}
