import { api } from './api';
import { 
  CashSession, 
  CashBalance, 
  OpenCashSessionRequest, 
  CloseCashSessionResponse,
  ManualMovementRequest,
  CashMovement
} from '@/types/cash.types';

class CashService {
  // Abrir caja
  async openCashSession(data: OpenCashSessionRequest): Promise<{ message: string; cashSession: CashSession }> {
    try {
      const response = await api.post('/cash-session', data);
      return response.data;
    } catch (error) {
      console.error('Error al abrir caja:', error);
      throw error;
    }
  }

  // Cerrar caja
  async closeCashSession(sessionId: string): Promise<CloseCashSessionResponse> {
    try {
      const response = await api.post(`/cash-session/${sessionId}/close`);
      return response.data;
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      throw error;
    }
  }

  // Obtener sesión de caja actual
  async getCurrentCashSession(storeId: string): Promise<CashSession | null> {
    try {
      const response = await api.get(`/cash-session/current/${storeId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener sesión actual:', error);
      return null;
    }
  }

  // Obtener cuadre de caja
  async getCashBalance(sessionId: string): Promise<CashBalance> {
    try {
      const response = await api.get(`/cash-movement/balance/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener cuadre de caja:', error);
      throw error;
    }
  }

  // Agregar movimiento manual
  async addManualMovement(data: ManualMovementRequest): Promise<CashMovement> {
    try {
      const response = await api.post('/cash-movement/manual', data);
      return response.data;
    } catch (error) {
      console.error('Error al agregar movimiento:', error);
      throw error;
    }
  }

  // Obtener historial de sesiones de caja
  async getCashSessions(storeId: string, page = 1, limit = 20): Promise<{ data: CashSession[]; total: number }> {
    try {
      const response = await api.get(`/cash-session/store/${storeId}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de sesiones:', error);
      throw error;
    }
  }

  // Obtener movimientos de una sesión
  async getCashMovements(sessionId: string, page = 1, limit = 50): Promise<{ data: CashMovement[]; total: number }> {
    try {
      const response = await api.get(`/cash-movement/session/${sessionId}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  }
}

export const cashService = new CashService();
