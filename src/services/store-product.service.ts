import { api } from './api';
import {
  StoreProduct,
  Product,
  CreateStoreProductRequest,
  StoreProductsResponse,
  ProductsResponse
} from '@/types/store-product.types';

class StoreProductService {
  // Obtener productos de la tienda actual
  async getStoreProducts(storeId: string, page = 1, limit = 20, search = ''): Promise<{data: StoreProduct[], total: number, page: number, limit: number, totalPages: number}> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      
      // Endpoint correcto: GET /store/products/store/:storeId
      console.log('🔍 Intentando endpoint:', `/store/products/store/${storeId}?${params}`);
      const response = await api.get(`/store/products/store/${storeId}?${params}`);
      return response.data; // El backend devuelve {data: Array, total, page, limit, totalPages}
    } catch (error) {
      console.error('Error al obtener productos de la tienda:', error);
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

      // Obtener token para debug
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      console.log('[StoreProductService.updateStoreProduct] Preparando petición PATCH', {
        url,
        id,
        data,
        token,
      });

      const response = await api.patch(url, data);

      console.log('[StoreProductService.updateStoreProduct] Respuesta exitosa', {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      console.error('[StoreProductService.updateStoreProduct] Error al actualizar producto de tienda:', error);

      // Log extendido del error para depuración (Axios)
      const anyError = error as any;
      console.error('[StoreProductService.updateStoreProduct] Detalles del error:', {
        message: anyError?.message,
        code: anyError?.code,
        responseStatus: anyError?.response?.status,
        responseData: anyError?.response?.data,
        config: {
          url: anyError?.config?.url,
          method: anyError?.config?.method,
          data: anyError?.config?.data,
          headers: anyError?.config?.headers,
        },
      });

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
