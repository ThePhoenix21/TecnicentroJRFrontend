import { api } from './api';
import { CashSession, CashClosingPrintResponse } from '@/types/cash.types';

export interface CreateCashSessionRequest {
  storeId: string;
  openingAmount: number;
}

export interface CloseCashSessionRequest {
  email: string;
  password: string;
  declaredAmount?: number;
}

export interface GetClosedCashSessionsRequest {
  storeId?: string;
  from?: string;
  to?: string;
  openedByName?: string;
  page?: number;
  pageSize?: number;
}

export interface GetClosedCashSessionsResponse {
  data: CashSession[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export class CashSessionService {
  // ✅ Obtener todas las sesiones de caja (solo ADMIN)
  async getCashSessions(): Promise<CashSession[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get('/cash-session', {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener sesiones de caja:', error);
      throw error;
    }
  }

  // ✅ Obtener sesiones de caja cerradas por tienda (con filtros y paginación)
  async getClosedCashSessionsByStore(payload: GetClosedCashSessionsRequest): Promise<GetClosedCashSessionsResponse> {
    try {
      const token = localStorage.getItem("auth_token");
      
      // Construir query params para GET
      const queryParams = new URLSearchParams();
      if (payload.storeId) queryParams.set('storeId', payload.storeId);
      if (payload.from) queryParams.set('from', payload.from);
      if (payload.to) queryParams.set('to', payload.to);
      if (payload.openedByName) queryParams.set('openedByName', payload.openedByName);
      if (payload.page) queryParams.set('page', payload.page.toString());
      if (payload.pageSize) queryParams.set('pageSize', payload.pageSize.toString());
      
      const response = await api.get(`/cash-session/store/closed?${queryParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener sesiones de caja cerradas:', error);
      throw error;
    }
  }

  // ✅ Obtener sesiones de caja por tienda (con paginación)
  async getCashSessionsByStore(storeId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get(`/cash-session/store/${storeId}?page=${page}&limit=${limit}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener sesiones de caja de la tienda:', error);
      throw error;
    }
  }

  // ✅ Obtener sesión de caja abierta para una tienda
  async getOpenCashSession(storeId: string): Promise<CashSession | null> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get(`/cash-session/store/${storeId}/open`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error: any) {
      // Si no hay sesión abierta, retornar null
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error al obtener sesión de caja abierta:', error);
      throw error;
    }
  }

  // ✅ Crear nueva sesión de caja
  async createCashSession(data: CreateCashSessionRequest): Promise<any> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.post('/cash-session', data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error: any) {
      // 409 es un caso de negocio esperado (sesión abierta en otra tienda)
      // y se maneja en la UI con un modal específico.
      if (error?.response?.status !== 409) {
        console.error('Error al crear sesión de caja:', error);
      }
      throw error;
    }
  }

  // ✅ Cerrar sesión de caja (actualizado: POST y requiere email/password)
  async closeCashSession(sessionId: string, data: CloseCashSessionRequest): Promise<any> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.post(`/cash-session/${sessionId}/close`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al cerrar sesión de caja:', error);
      throw error;
    }
  }

  // ✅ Obtener sesión de caja por ID
  async getCashSessionById(sessionId: string): Promise<CashSession> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get(`/cash-session/${sessionId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener sesión de caja:', error);
      throw error;
    }
  }

  // ✅ Obtener sesión actual de una tienda
  async getCurrentSessionByStore(storeId: string): Promise<CashSession | null> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get(`/cash-session/current/${storeId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error: any) {
      // Si no hay sesión actual, retornar null
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error al obtener sesión actual de la tienda:', error);
      throw error;
    }
  }

  // ✅ Obtener datos listos para impresión del cierre de caja
  async getCashClosingPrint(sessionId: string): Promise<CashClosingPrintResponse> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get(`/cash-session/${sessionId}/closing-print`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener datos de impresión de cierre de caja:', error);
      throw error;
    }
  }
}

export const cashSessionService = new CashSessionService();