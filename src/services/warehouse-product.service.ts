import type { WarehouseProduct, WarehouseProductCreateDto, WarehouseProductUpdateDto, WarehouseProductsListResponse } from '@/types/store-product.types';

const getWarehouseHeaders = () => {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const rawWarehouse = localStorage.getItem('current_warehouse');
    if (rawWarehouse) {
      try {
        const parsed = JSON.parse(rawWarehouse);
        if (parsed?.id) {
          headers['x-warehouse-id'] = String(parsed.id);
        }
      } catch {
        // ignore
      }
    }
  }

  return headers;
};

class WarehouseProductService {
  async list(params: {
    page?: number;
    pageSize?: number;
    name?: string;
    inStock?: boolean;
  } = {}): Promise<WarehouseProductsListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 1));
    searchParams.set('pageSize', String(params.pageSize ?? 12));
    if (params.name) searchParams.set('name', params.name);
    if (typeof params.inStock === 'boolean') searchParams.set('inStock', String(params.inStock));

    const response = await fetch(`/api/warehouse/products?${searchParams.toString()}`, {
      method: 'GET',
      headers: getWarehouseHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as WarehouseProductsListResponse;
  }

  async getById(id: string): Promise<WarehouseProduct> {
    const response = await fetch(`/api/warehouse/products/${id}`, {
      method: 'GET',
      headers: getWarehouseHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as WarehouseProduct;
  }

  async create(dto: WarehouseProductCreateDto): Promise<WarehouseProduct> {
    const response = await fetch('/api/warehouse/products', {
      method: 'POST',
      headers: {
        ...getWarehouseHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as WarehouseProduct;
  }

  async update(id: string, dto: WarehouseProductUpdateDto): Promise<WarehouseProduct> {
    const response = await fetch(`/api/warehouse/products/${id}`, {
      method: 'PATCH',
      headers: {
        ...getWarehouseHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as WarehouseProduct;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/warehouse/products/${id}`, {
      method: 'DELETE',
      headers: getWarehouseHeaders(),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}

export const warehouseProductService = new WarehouseProductService();
