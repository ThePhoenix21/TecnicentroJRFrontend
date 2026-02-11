import { api } from './api';
import { AxiosError } from 'axios';
import { 
  InventoryMovement, 
  CreateInventoryMovementDTO, 
  InventoryMovementFilters,
  InventoryMovementsListResponse,
  InventoryMovementsQuery,
  InventoryStats,
  CreateInventoryCountSessionDTO,
  InventoryCountSession,
  InventoryCountItem,
  InventorySessionReport,
  ProductLookupItem,
  UserLookupItem,
  InventorySummaryResponse
} from '@/types/inventory.types';

export const inventoryService = {
  // --- Movimientos ---
  
  async getMovimientos(filters?: InventoryMovementFilters): Promise<InventoryMovement[]> {
    try {
      const response = await api.get<InventoryMovement[]>('/inventory-movements', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory movements:', error);
      throw new Error('No se pudieron cargar los movimientos de inventario.');
    }
  },

  async getMovementsSummary(params: { storeId: string; fromDate?: string; toDate?: string }): Promise<InventorySummaryResponse> {
    const { storeId, fromDate, toDate } = params;
    if (!storeId) {
      throw new Error('storeId es requerido para obtener el resumen de inventario.');
    }

    try {
      const response = await api.get<InventorySummaryResponse>('/inventory-movements/summary', {
        params: {
          storeId,
          fromDate,
          toDate,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || 'No se pudo obtener el resumen de movimientos.';
      throw new Error(message);
    }
  },

  async getInventoryMovements(query: InventoryMovementsQuery = {}): Promise<InventoryMovementsListResponse> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.set('page', String(query.page));
      if (query.pageSize) params.set('pageSize', String(query.pageSize));
      if (query.name) params.set('name', query.name);
      if (query.type) params.set('type', query.type);
      if (query.userId) params.set('userId', query.userId);
      if (query.userName) params.set('userName', query.userName);
      if (query.fromDate) params.set('fromDate', query.fromDate);
      if (query.toDate) params.set('toDate', query.toDate);

      const qs = params.toString();
      const url = qs ? `/inventory-movements?${qs}` : '/inventory-movements';

      const response = await api.get<any>(url);

      // Soportar distintos formatos de respuesta del backend
      if (Array.isArray(response.data)) {
        const data = response.data as InventoryMovement[];
        return {
          data,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? data.length,
          total: data.length,
          totalPages: 1,
        };
      }

      // Formato esperado: { data, page, pageSize, total, totalPages }
      return response.data as InventoryMovementsListResponse;
    } catch (error) {
      console.error('Error fetching inventory movements:', error);
      throw new Error('No se pudieron cargar los movimientos de inventario.');
    }
  },

  async getProductsLookup(search: string): Promise<ProductLookupItem[]> {
    // Backend actual: /catalog/products/lookup (lista completa ordenada)
    // El parámetro search puede existir en otras implementaciones, pero aquí lo ignoramos.
    const response = await api.get<ProductLookupItem[]>('/catalog/products/lookup');
    return response.data;
  },

  async getUsersLookup(): Promise<UserLookupItem[]> {
    const response = await api.get<UserLookupItem[]>('/users/lookup');
    return response.data;
  },

  async createMovimiento(data: CreateInventoryMovementDTO): Promise<InventoryMovement> {
    try {
      const response = await api.post<InventoryMovement>('/inventory-movements', data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || 'Error al registrar el movimiento.';
      throw new Error(message);
    }
  },

  async getMovimientosByProduct(storeProductId: string): Promise<InventoryMovement[]> {
    try {
      const response = await api.get<InventoryMovement[]>(`/inventory-movements/product/${storeProductId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching movements for product ${storeProductId}:`, error);
      return [];
    }
  },

  async getDashboardStats(storeId?: string): Promise<InventoryStats> {
    try {
      const response = await api.get<InventoryStats>('/inventory-movements/dashboard', {
        params: { storeId }
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.message || 'No se pudieron cargar las estadísticas del inventario.';
      const mappedError = new Error(message) as Error & { status?: number };
      mappedError.status = status;
      console.error('Error fetching inventory dashboard stats:', axiosError);
      throw mappedError;
    }
  },

  // --- Inventario Físico ---

  async getSessions(storeId: string): Promise<InventoryCountSession[]> {
    try {
      // Corregido: Usamos singular '/inventory-count/session' igual que en creación
      const response = await api.get<InventoryCountSession[]>('/inventory-count/session', {
        params: { storeId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory sessions:', error);
      // Si falla, devolvemos array vacío para no romper la UI
      return []; 
    }
  },

  async createCountSession(data: CreateInventoryCountSessionDTO): Promise<InventoryCountSession> {
    try {
      const response = await api.post<InventoryCountSession>('/inventory-count/session', data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Error al crear la sesión de inventario.');
    }
  },

  async addCountItem(sessionId: string, data: { storeProductId: string; physicalStock: number }): Promise<InventoryCountItem> {
    try {
      const response = await api.post<InventoryCountItem>(`/inventory-count/session/${sessionId}/items`, data);
      return response.data;
    } catch (error) {
      console.error('Error adding count item:', error);
      throw error;
    }
  },

  async updateCountItem(itemId: string, data: { physicalStock: number }): Promise<InventoryCountItem> {
    try {
      const response = await api.patch<InventoryCountItem>(`/inventory-count/items/${itemId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating count item:', error);
      throw error;
    }
  },

  async closeSession(sessionId: string): Promise<InventorySessionReport> {
    try {
      const response = await api.post<InventorySessionReport>(`/inventory-count/session/${sessionId}/close`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'Error al finalizar la sesión.');
    }
  },

  async getSessionReport(sessionId: string): Promise<InventoryCountSession> {
    try {
      const response = await api.get<InventoryCountSession>(`/inventory-count/session/${sessionId}/report`);
      return response.data;
    } catch (error) {
      console.error('Error fetching session report:', error);
      throw new Error('No se pudo cargar el reporte de la sesión.');
    }
  }
};
