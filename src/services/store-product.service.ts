import { domainApi } from './domainApi';
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
  CatalogProductSkuLookupItem,
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
    search?: string;
    sku?: string;
  } = {}): Promise<{ data: StoreProduct[] }> {
    try {
      // Endpoint: GET /store/products/store/{storeId}/simple?search=text&sku=SKU
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.sku) params.set('sku', options.sku);
      const qs = params.toString();

      const response = await domainApi.get<{ data: StoreProduct[] }>({
        store: `/store/products/store/${storeId}/simple${qs ? `?${qs}` : ''}`,
        warehouse: `/warehouse/products/simple${qs ? `?${qs}` : ''}`,
      });
      return response.data; // El backend devuelve {data: Array}
    } catch (error) {
      const anyError = error as any;
      console.error('[StoreProductService.getStoreProductsSimple] Error:', anyError);
      throw error;
    }

  }

  async getCatalogProductSkuLookup(search: string): Promise<CatalogProductSkuLookupItem[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const qs = params.toString();
      const url = qs ? `/catalog/products/lookup-sku-id?${qs}` : '/catalog/products/lookup-sku-id';
      const response = await api.get<CatalogProductSkuLookupItem[]>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getCatalogProductSkuLookup] Error:', error);
      throw error;
    }
  }

  async getInventoryReport(params: { storeId: string; page?: number; pageSize?: number }) {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('storeId', params.storeId);
      searchParams.set('page', String(params.page ?? 1));
      searchParams.set('pageSize', String(params.pageSize ?? 12));
      const response = await domainApi.get<{
        data: Array<{ id: string; name: string; stock: number; stockThreshold: number }>;
        total: number;
        totalPages: number;
        page: number;
        pageSize: number;
      }>({
        store: `/store/products/inventory-report?${searchParams.toString()}`,
        warehouse: `/store/products/inventory-report?${searchParams.toString()}`,
      });
      return response.data;
    } catch (error) {
      console.error('[StoreProductService.getInventoryReport] Error:', error);
      throw error;
    }
  }

  async getStoreProductIdByCatalogProduct(params: { productId: string; storeId: string }): Promise<string | null> {
    try {
      const searchParams = new URLSearchParams({
        productId: params.productId,
        storeId: params.storeId,
      });
      const response = await api.get<{ id?: string; storeProductId?: string }>(
        `/store/products/lookup-store-product-id?${searchParams.toString()}`
      );
      return response.data?.storeProductId ?? response.data?.id ?? null;
    } catch (error) {
      console.error('[StoreProductService.getStoreProductIdByCatalogProduct] Error:', error);
      throw error;
    }
  }

  async getStoreProductsLookup(params?: { storeId?: string; search?: string }): Promise<Array<{ id: string; name: string }>> {
    try {
      const activeLoginMode = (() => {
        if (typeof window === 'undefined') return null;
        try {
          const raw = localStorage.getItem('user');
          if (!raw) return null;
          const parsed = JSON.parse(raw) as { activeLoginMode?: string | null };
          return parsed.activeLoginMode ?? null;
        } catch {
          return null;
        }
      })();

      // En modo WAREHOUSE el lookup proviene del catálogo global del tenant.
      // No depende de storeId/warehouseId.
      if (activeLoginMode === 'WAREHOUSE') {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        const qs = searchParams.toString();
        const url = qs ? `/catalog/products/lookup?${qs}` : '/catalog/products/lookup';
        const response = await api.get(url);
        return Array.isArray(response.data) ? response.data : [];
      }

      const searchParams = new URLSearchParams();
      if (params?.storeId) searchParams.set('storeId', params.storeId);
      if (params?.search) searchParams.set('search', params.search);
      const qs = searchParams.toString();
      const url = qs ? `/store/products/lookup?${qs}` : '/store/products/lookup';
      const response = await domainApi.get({
        store: url,
        warehouse: url,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getStoreProductsLookup] Error:', error);
      throw error;
    }
  }

  async getStoreProductsStock(storeId: string): Promise<StoreProductStockItem[]> {
    try {
      const params = new URLSearchParams({ storeId });
      const response = await domainApi.get({
        store: `/catalog/products/store-stock?${params.toString()}`,
        warehouse: `/warehouse/products/store-stock?${params.toString()}`,
      });
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
    sku?: string;
    inStock?: boolean;
  }): Promise<StoreProductsListResponse> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('storeId', params.storeId);
      searchParams.set('page', String(params.page ?? 1));
      searchParams.set('pageSize', String(params.pageSize ?? 12));
      if (params.name) searchParams.set('name', params.name);
      if (params.sku) searchParams.set('sku', params.sku);
      if (typeof params.inStock === 'boolean') searchParams.set('inStock', String(params.inStock));

      const response = await domainApi.get<StoreProductsListResponse>({
        store: `/store/products/list?${searchParams.toString()}`,
        warehouse: `/warehouse/products/list?${searchParams.toString()}`,
      });
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

  async getCatalogProductsLookupSku(search?: string): Promise<CatalogProductLookupItem[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const qs = params.toString();
      const url = qs ? `/catalog/products/lookup-sku?${qs}` : '/catalog/products/lookup-sku';
      const response = await api.get<CatalogProductLookupItem[]>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[StoreProductService.getCatalogProductsLookupSku] Error:', error);
      throw error;
    }
  }

  async getCatalogProductBySku(sku: string): Promise<CatalogProductLookupItem | null> {
    try {
      const params = new URLSearchParams({ sku });
      const response = await api.get<CatalogProductLookupItem | CatalogProductLookupItem[]>(
        `/catalog/products/lookup-sku?${params.toString()}`
      );
      const payload = response.data;
      if (Array.isArray(payload)) return payload[0] ?? null;
      if (payload && typeof payload === 'object' && 'id' in payload) {
        return payload as CatalogProductLookupItem;
      }
      return null;
    } catch (error) {
      console.error('[StoreProductService.getCatalogProductBySku] Error:', error);
      throw error;
    }
  }

  async getStoreProductDetail(id: string): Promise<StoreProductDetail> {
    try {
      const response = await domainApi.get<StoreProductDetail>({
        store: `/store/products/findOne/${id}`,
        warehouse: `/warehouse/products/${id}`,
      });
      return response.data;
    } catch (error) {
      console.error('[StoreProductService.getStoreProductDetail] Error:', error);
      throw error;
    }
  }

  async deleteCatalogProduct(productId: string, payload: CatalogProductDeletePayload): Promise<void> {
    try {
      await domainApi.delete({
        store: `/catalog/products/remove/${productId}`,
        warehouse: `/warehouse/products/${productId}`,
      }, { data: payload });
    } catch (error) {
      console.error('[StoreProductService.deleteCatalogProduct] Error:', error);
      throw error;
    }
  }

  // Get current warehouse ID from localStorage
  private getCurrentWarehouseId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('current_warehouse');
      if (!raw) return null;
      const warehouse = JSON.parse(raw) as { id?: string };
      return warehouse?.id || null;
    } catch {
      return null;
    }
  }

  // Obtener productos de la tienda actual
  async getStoreProducts(storeId: string | undefined, page = 1, limit = 20, search = ''): Promise<{data: StoreProduct[], total: number, page: number, limit: number, totalPages: number}> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);

      const response = await domainApi.get<{data: StoreProduct[], total: number, page: number, limit: number, totalPages: number}>({
        store: `/store/products/store/${storeId!}?${params.toString()}`,
        warehouse: `/warehouse/products/warehouse/${this.getCurrentWarehouseId()}?${params.toString()}`,
      });
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

  // Crear producto de tienda (nuevo o existente)
  async createStoreProduct(data: CreateStoreProductRequest): Promise<StoreProduct> {
    const sanitizedSku = typeof data.sku === 'string' ? data.sku.trim() : undefined;
    const payload: CreateStoreProductRequest = {
      ...data,
      ...(sanitizedSku ? { sku: sanitizedSku } : {}),
    };

    try {
      const response = await domainApi.post<StoreProduct>({
        store: '/store/products/create',
        warehouse: '/warehouse/products',
      }, payload);
      const responseData = response.data as any;
      if (responseData?.statusCode === 409 || (typeof responseData?.message === 'string' && responseData.message.toLowerCase().includes('sku'))) {
        const conflictError = new Error(responseData?.message || 'SKU en uso');
        (conflictError as any).response = {
          status: responseData?.statusCode ?? 409,
          data: responseData,
        };
        throw conflictError;
      }
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      const possibleMessages = [
        ...(Array.isArray(responseData?.message) ? responseData.message : []),
        typeof responseData?.message === 'string' ? responseData.message : '',
        typeof responseData?.error === 'string' ? responseData.error : '',
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();

      // Compatibilidad: algunos backends aún no aceptan `sku` en el DTO de creación
      const skuIsUnknownField =
        status === 400 &&
        !!payload.sku &&
        (possibleMessages.includes('property sku should not exist') ||
          possibleMessages.includes('sku should not exist'));

      if (skuIsUnknownField) {
        const { sku: _ignoredSku, ...payloadWithoutSku } = payload;
        const retryResponse = await domainApi.post<StoreProduct>(
          {
            store: '/store/products/create',
            warehouse: '/warehouse/products',
          },
          payloadWithoutSku
        );
        return retryResponse.data;
      }

      if (status === 409) {
        throw error;
      }

      console.error('Error al crear producto de tienda:', error);
      throw error;
    }
  }

  // Actualizar producto de tienda
  async updateStoreProduct(id: string, data: any): Promise<StoreProduct> {
    try {
      // Endpoint correcto: PATCH /store/products/update/:id
      const response = await domainApi.patch<StoreProduct>({
        store: `/store/products/update/${id}`,
        warehouse: `/warehouse/products/${id}`,
      }, data);

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
      await domainApi.delete({
        store: `/store/products/remove/${id}`,
        warehouse: `/warehouse/products/${id}`,
      });
    } catch (error) {
      console.error('Error al eliminar producto de tienda:', error);
      throw error;
    }
  }

  // Actualizar stock
  async updateStock(id: string, stock: number): Promise<StoreProduct> {
    try {
      const response = await domainApi.patch<StoreProduct>({
        store: `/store/products/${id}/stock`,
        warehouse: `/warehouse/products/${id}/stock`,
      }, { stock });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }
  }
}

export const storeProductService = new StoreProductService();
