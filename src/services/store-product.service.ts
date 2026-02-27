import { api } from './api';
import {
  StoreProduct,
  Product,
  CreateStoreProductRequest,
  StoreProductsResponse,
  ProductsResponse,
  StoreProductStockItem,
  StoreProductsListResponse,
  CatalogProductLookupItem,
  StoreProductDetail,
  CatalogProductDeletePayload
} from '@/types/store-product.types';

const isAuthOrForbiddenError = (error: unknown) => {
  const status = (error as any)?.response?.status;
  return status === 401 || status === 403;
};

class StoreProductService {
  // Obtener productos simples de la tienda para el formulario de ventas
  async getStoreProductsSimple(storeId: string, options: {
    page?: number;
    pageSize?: number;
    search?: string;
  } = {}): Promise<{data: StoreProduct[], total: number}> {
    try {
      // Endpoint: GET /store/products/store/{storeId}/simple?page=1&pageSize=20&search=text
      const params = new URLSearchParams();
      if (options.page) params.set('page', options.page.toString());
      if (options.pageSize) params.set('pageSize', options.pageSize.toString());
      if (options.search) params.set('search', options.search);
      
      const response = await api.get(`/store/products/store/${storeId}/simple?${params}`);
      return response.data; // El backend devuelve {data: Array, total}
    } catch (error) {
      const anyError = error as any;
      console.error('[StoreProductService.getStoreProductsSimple] Error:', anyError);
      throw error;
    }

  }

  async getStoreProductsLookup(params?: { storeId?: string; search?: string }): Promise<Array<{ id: string; name: string }>> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.storeId) searchParams.set('storeId', params.storeId);
      if (params?.search) searchParams.set('search', params.search);
      const qs = searchParams.toString();
      const url = qs ? `/store/products/lookup?${qs}` : '/store/products/lookup';
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getStoreProductsLookup] Error:', error);
      throw error;
    }
  }

  async getStoreProductsStock(storeId: string): Promise<StoreProductStockItem[]> {
    try {
      const params = new URLSearchParams({ storeId });
      const response = await api.get(`/catalog/products/store-stock?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getStoreProductsStock] Error:', error);
      throw error;
    }
  }

  async getStoreProductsList(params: {
    storeId: string;
    page?: number;
    pageSize?: number;
    name?: string;
    inStock?: boolean;
  }): Promise<StoreProductsListResponse> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('storeId', params.storeId);
      searchParams.set('page', String(params.page ?? 1));
      searchParams.set('pageSize', String(params.pageSize ?? 12));
      if (params.name) searchParams.set('name', params.name);
      if (typeof params.inStock === 'boolean') searchParams.set('inStock', String(params.inStock));

      const response = await api.get<StoreProductsListResponse>(`/store/products/list?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('[StoreProductService.getStoreProductsList] Error:', error);
      throw error;
    }
  }

  async getCatalogProductsLookup(search: string): Promise<CatalogProductLookupItem[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const qs = params.toString();
      const url = qs ? `/catalog/products/lookup?${qs}` : '/catalog/products/lookup';
      const response = await api.get<CatalogProductLookupItem[]>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getCatalogProductsLookup] Error:', error);
      throw error;
    }
  }

  async getStoreProductDetail(id: string): Promise<StoreProductDetail> {
    try {
      const response = await api.get<StoreProductDetail>(`/store/products/findOne/${id}`);
      return response.data;
    } catch (error) {
      console.error('[StoreProductService.getStoreProductDetail] Error:', error);
      throw error;
    }
  }

  async deleteCatalogProduct(productId: string, payload: CatalogProductDeletePayload): Promise<void> {
    try {
      await api.delete(`/catalog/products/remove/${productId}`, { data: payload });
    } catch (error) {
      console.error('[StoreProductService.deleteCatalogProduct] Error:', error);
      throw error;
    }
  }

  // Obtener productos de la tienda actual
  async getStoreProducts(storeId: string, page = 1, limit = 20, search = ''): Promise<{data: StoreProduct[], total: number, page: number, limit: number, totalPages: number}> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);

      const response = await api.get(`/store/products/store/${storeId}?${params}`);
      return response.data; // El backend devuelve {data: Array, total, page, limit, totalPages}
    } catch (error) {
      if (isAuthOrForbiddenError(error)) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        };
      }

      const anyError = error as any;
      const tokenPresent = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false;
      // Nota: el overlay de Next a veces serializa los objetos como {}. Por eso logueamos
      // tanto el error crudo como un string con detalles.
      console.error('[StoreProductService.getStoreProducts] AxiosError (raw):', anyError);

      const details = {
        message: anyError?.message,
        code: anyError?.code,
        status: anyError?.response?.status,
        data: anyError?.response?.data,
        url: anyError?.config?.url,
        baseURL: anyError?.config?.baseURL,
        method: anyError?.config?.method,
        tokenPresent,
      };

      console.error('[StoreProductService.getStoreProducts] Details:', details);
      console.error('[StoreProductService.getStoreProducts] Details (JSON):', JSON.stringify(details));
      throw error;
    }
  }

  // Obtener todos los productos globales (para seleccionar al crear)
  async getAllProducts(page = 1, limit = 50, search = ''): Promise<ProductsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      
      // Endpoint correcto: GET /catalog/products/all
      const response = await api.get(`/catalog/products/all?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  }

  // Crear producto de tienda (nuevo o existente)
  async createStoreProduct(data: CreateStoreProductRequest): Promise<StoreProduct> {
    try {
      const response = await api.post('/store/products/create', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear producto de tienda:', error);
      throw error;
    }
  }

  // Actualizar producto de tienda
  async updateStoreProduct(id: string, data: any): Promise<StoreProduct> {
    try {
      // Endpoint correcto: PATCH /store/products/update/:id
      const url = `/store/products/update/${id}`;

      const response = await api.patch(url, data);

      return response.data;
    } catch (error) {
      console.error('Error al actualizar producto de tienda:', error);
      throw error;
    }
  }

  // Eliminar producto de tienda
  async deleteStoreProduct(id: string): Promise<void> {
    try {
      // Endpoint correcto: DELETE /store/products/remove/:id
      await api.delete(`/store/products/remove/${id}`);
    } catch (error) {
      console.error('Error al eliminar producto de tienda:', error);
      throw error;
    }
  }

  // Actualizar stock
  async updateStock(id: string, stock: number): Promise<StoreProduct> {
    try {
      const response = await api.patch(`/store/products/${id}/stock`, { stock });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }
  }
}

export const storeProductService = new StoreProductService();
