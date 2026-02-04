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

  // ✅ Obtener sesiones de caja cerradas por tienda (con filtros)
  async getClosedCashSessionsByStore(payload: GetClosedCashSessionsRequest): Promise<CashSession[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.post('/cash-session/store/closed', payload, {
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
    } catch (error) {
      console.error('Error al crear sesión de caja:', error);
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