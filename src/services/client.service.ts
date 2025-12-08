// src/services/client.service.ts
import { api } from './api';
import { AxiosError } from 'axios';

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

export const clientService = {
  async getClients(page: number = 1, limit: number = 10): Promise<ClientsResponse> {
    try {
      console.log('Obteniendo clientes...', { page, limit });
      const response = await api.get<ClientsResponse>('/clientes', {
        params: { page, limit }
      });

      console.log('Respuesta del backend (getClients):', response.data);
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

  // ✅ CORREGIDO: Solo ADMIN puede buscar
  async searchClients(query: string): Promise<Client[]> {
    console.log('Buscando clientes con query:', query);
    try {
      // El backend requiere mínimo 3 caracteres
      if (query.trim().length < 3) {
        console.log('La búsqueda requiere mínimo 3 caracteres');
        return [];
      }

      const response = await api.get<Client[]>('/clientes/search', {
        params: { query }
      });
      console.log('Resultados de búsqueda:', response.data);
      return response.data || [];
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      // ✅ Manejar error de permisos específico para búsqueda
      if (axiosError.response?.status === 403) {
        console.log('No tienes permisos para buscar clientes (solo ADMIN)');
        throw new Error('No tienes permisos para buscar clientes. Esta función está disponible solo para administradores.');
      }
      
      if (axiosError.response?.status === 400) {
        console.log('Búsqueda inválida o muy corta');
        return [];
      }
      
      if (axiosError.response?.status === 404) {
        console.log('No se encontraron resultados para la búsqueda');
        return [];
      }
      
      console.error('Error searching clients:', {
        message: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      return [];
    }
  },

  async getClientByDni(dni: string): Promise<Client | null> {
    console.log('Buscando cliente con DNI:', dni);
    try {
      // ✅ USAR NUEVO ENDPOINT DIRECTO (no requiere permisos de ADMIN)
      const response = await api.get<Client>(`/clientes/dni/${dni}`);
      console.log('Respuesta de getClientByDni directo:', response.data);
      return response.data;
      
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      console.error('Error en getClientByDni:', {
        dni,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        url: axiosError.config?.url
      });
      
      // ✅ Manejar error de permisos específico
      if (error instanceof Error && error.message.includes('solo ADMIN')) {
        throw error;
      }
      
      // Si es 404, el cliente no existe (no es error, es resultado esperado)
      if (axiosError.response?.status === 404) {
        console.log('Cliente no encontrado con DNI:', dni);
        return null;
      }
      
      throw new Error(
        axiosError.response?.data?.message || 
        'Error al buscar el cliente por DNI. Por favor, intente nuevamente.'
      );
    }
  },

  async getClientById(id: string): Promise<Client> {
    console.log('Obteniendo cliente con ID:', id);
    try {
      const response = await api.get<Client>(`/clientes/${id}`);
      console.log('Respuesta de getClientById:', response.data);
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

  async createClient(clientData: CreateClientDto): Promise<Client> {
    console.log('Creando nuevo cliente con datos:', clientData);
    try {
      // Validaciones obligatorias según el backend
      if (!clientData.dni) {
        throw new Error('El DNI es obligatorio para crear un cliente');
      }
      if (!clientData.userId) {
        throw new Error('El userId es obligatorio para crear un cliente');
      }
      
      const response = await api.post<Client>('/clientes', clientData);
      console.log('Cliente creado exitosamente:', response.data);
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
    console.log(`Actualizando cliente ID ${id} con datos:`, clientData);
    try {
      const response = await api.patch<Client>(`/clientes/${id}`, clientData);
      console.log('Cliente actualizado exitosamente:', response.data);
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
    console.log('Eliminando cliente con ID:', id);
    try {
      const response = await api.delete(`/clientes/${id}`);
      console.log('Cliente eliminado exitosamente');
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