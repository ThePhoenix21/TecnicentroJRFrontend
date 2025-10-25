// src/services/sale.service.ts
import { api } from './api';

export interface ClientInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  dni?: string;  // Changed from 'string' to 'string | undefined' to match component usage
}

export interface SaleProduct {
  productId: string;
  quantity: number;
}

export interface SaleService {
  name: string;
  description: string;
  price: number;
  type: 'REPAIR' | 'WARRANTY';
  photoUrls?: string[];
}

export interface CreateSaleRequest {
  clientInfo: ClientInfo;
  products: SaleProduct[];
  services: SaleService[];
}

export interface SaleResponse {
  id: string;
  orderNumber: string; // Added orderNumber field that backend assigns
  clientInfo: ClientInfo;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  services: Array<{
    name: string;
    description: string;
    price: number;
    type: string;
    photoUrls: string[];
  }>;
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export const createSale = async (saleData: CreateSaleRequest): Promise<SaleResponse> => {
  try {
    const response = await api.post<SaleResponse>('/sales', saleData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
};

export const getSales = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  items: SaleResponse[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}> => {
  try {
    const response = await api.get('/sales', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
};

export const getSaleById = async (id: string): Promise<SaleResponse> => {
  try {
    const response = await api.get<SaleResponse>(`/sales/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sale ${id}:`, error);
    throw error;
  }
};