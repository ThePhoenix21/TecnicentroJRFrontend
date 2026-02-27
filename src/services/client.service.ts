// src/services/client.service.ts
import { api } from './api';
import { AxiosError } from 'axios';

import type {
  ClientFilters,
  ClientFull,
  ClientLookupDniItem,
  ClientLookupNameItem,
  ClientLookupPhoneItem,
  ClientsListResponse,
} from '@/types/client.types';

// Interfaces basadas en el backend
export interface Client {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  ruc: string | null;
  dni: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string;
  dni: string; // obligatorio
  userId: string; // obligatorio
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string;
  dni?: string;
  userId?: string;
}

export interface ClientsResponse {
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const isAuthError = (error: unknown) => {
  const status = (error as any)?.response?.status;
  return status === 401 || status === 403;
};

export const clientService = {
  async getClients(page: number = 1, pageSize: number = 12, filters: ClientFilters = {}): Promise<ClientsListResponse> {
    try {
      const response = await api.get<ClientsListResponse>('/clientes', {
        params: { page, pageSize, ...filters }
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      console.error('Error en getClients:', {
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      // Manejar error de permisos específico
      if (axiosError.response?.status === 403) {
        throw new Error('No tienes permisos para ver la lista de clientes (solo ADMIN)');
      }
      
      throw new Error(
        axiosError.response?.data?.message || 
        'Error al obtener los clientes. Por favor, intente nuevamente.'
      );
    }
  },

  async getLookupName(): Promise<ClientLookupNameItem[]> {
    try {
      const response = await api.get<ClientLookupNameItem[]>('/clientes/lookup-name');
      return response.data;
    } catch (error) {
      if (!isAuthError(error)) {
        console.error('[clientService.getLookupName] Error:', error);
      }
      return [];
    }
  },

  async getLookupPhone(): Promise<ClientLookupPhoneItem[]> {
    try {
      const response = await api.get<ClientLookupPhoneItem[]>('/clientes/lookup-phone');
      return response.data;
    } catch (error) {
      if (!isAuthError(error)) {
        console.error('[clientService.getLookupPhone] Error:', error);
      }
      return [];
    }
  },

  async getLookupDni(): Promise<ClientLookupDniItem[]> {
    try {
      const response = await api.get<ClientLookupDniItem[]>('/clientes/lookup-dni');
      return response.data;
    } catch (error) {
      if (!isAuthError(error)) {
        console.error('[clientService.getLookupDni] Error:', error);
      }
      return [];
    }
  },

  async getClientByDni(dni: string): Promise<Client | null> {
    try {
      // ✅ USAR NUEVO ENDPOINT DIRECTO (no requiere permisos de ADMIN)
      const response = await api.get<Client>(`/clientes/dni/${dni}`);
      return response.data;
      
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      // ✅ Manejar error de permisos específico
      if (error instanceof Error && error.message.includes('solo ADMIN')) {
        throw error;
      }
      
      // Si es 404, el cliente no existe (no es error, es resultado esperado)
      if (axiosError.response?.status === 404) {
        return null;
      }
      
      // Solo loguear errores que no sean 404
      console.error('Error en getClientByDni:', {
        dni,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      throw new Error(
        axiosError.response?.data?.message || 
        'Error al buscar el cliente por DNI. Por favor, intente nuevamente.'
      );
    }
  },

  async getClientById(id: string): Promise<Client> {
    try {
      const response = await api.get<Client>(`/clientes/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error en getClientById:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      // ✅ Manejar error de permisos específico
      if (axiosError.response?.status === 403) {
        throw new Error('No tienes permisos para ver este cliente. Solo puedes ver tu propio perfil.');
      }
      
      throw new Error(axiosError.response?.data?.message || 'No se pudo cargar el cliente. Por favor, intente nuevamente.');
    }
  },

  async getClientFull(id: string): Promise<ClientFull> {
    const response = await api.get<ClientFull>(`/clientes/${id}/full`);
    return response.data;
  },

  async softDeleteClient(id: string): Promise<void> {
    await api.patch(`/clientes/${id}/soft-delete`);
  },

  async createClient(clientData: CreateClientDto): Promise<Client> {
    try {
      // Validaciones obligatorias según el backend
      if (!clientData.dni) {
        throw new Error('El DNI es obligatorio para crear un cliente');
      }
      if (!clientData.userId) {
        throw new Error('El userId es obligatorio para crear un cliente');
      }
      
      const response = await api.post<Client>('/clientes', clientData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error al crear cliente:', {
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        requestData: clientData
      });
      
      // ✅ Manejar error de conflicto específico
      if (axiosError.response?.status === 409) {
        throw new Error('El cliente ya existe (email, RUC o DNI duplicado)');
      }
      
      throw new Error(axiosError.response?.data?.message || 'No se pudo crear el cliente. Por favor, intente nuevamente.');
    }
  },

  async updateClient(id: string, clientData: UpdateClientDto): Promise<Client> {
    try {
      const { dni, ...payload } = clientData;
      const response = await api.patch<Client>(`/clientes/${id}`, payload);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error al actualizar cliente:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        requestData: clientData
      });
      
      // ✅ Manejar error de permisos específico
      if (axiosError.response?.status === 403) {
        throw new Error('No tienes permisos para actualizar este cliente. Solo puedes actualizar tu propio perfil.');
      }
      
      // ✅ Manejar error de conflicto específico
      if (axiosError.response?.status === 409) {
        throw new Error('Conflicto con datos únicos (email, RUC o DNI duplicado)');
      }
      
      throw new Error(axiosError.response?.data?.message || 'No se pudo actualizar el cliente. Por favor, intente nuevamente.');
    }
  },

  async deleteClient(id: string): Promise<void> {
    try {
      const response = await api.delete(`/clientes/${id}`);
      return;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      console.error('Error al eliminar cliente:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      // Mensajes de error específicos según el código de estado
      let errorMessage = 'No se pudo eliminar el cliente. ';
      
      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          errorMessage = 'El cliente no fue encontrado o ya fue eliminado.';
        } else if (axiosError.response.status === 403) {
          errorMessage = 'No tienes permiso para eliminar este cliente (solo ADMIN puede eliminar).';
        } else if (axiosError.response.status === 400) {
          errorMessage = 'Solicitud incorrecta. Verifica los datos e inténtalo de nuevo.';
        } else if (axiosError.response.data?.message) {
          errorMessage += `Error: ${axiosError.response.data.message}`;
        } else {
          errorMessage += `Error del servidor (${axiosError.response.status}).`;
        }
      } else if (axiosError.request) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión a internet.';
      } else {
        errorMessage = `Error al configurar la solicitud: ${axiosError.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
};