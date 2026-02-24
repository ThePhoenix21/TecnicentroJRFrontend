export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: User;
}

export interface CreateStoreDto {
  name: string;
  address?: string;
  phone?: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateStoreDto {
  name?: string;
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export interface StoreResponse {
  message: string;
  store: Store;
}

export interface StoreListResponse {
  stores: Store[];
}

export interface StoreLookupItem {
  id: string;
  name: string;
}
