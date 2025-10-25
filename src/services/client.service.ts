// src/services/client.service.ts
import { api } from './api';
import { AxiosError } from 'axios';
import { Client, CreateClientDto, UpdateClientDto, ClientsResponse } from '@/types/client.types';

export const clientService = {
  async getClients(page: number = 1, limit: number = 10): Promise<ClientsResponse> {
    try {
      console.log('Obteniendo clientes...', { page, limit });
      const response = await api.get<{
        data: Client[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }
      }>('/clientes', {
        params: { page, limit }
      });

      console.log('Respuesta del backend (getClients):', response.data);

      if (!response.data || !Array.isArray(response.data.data)) {
        console.log('No se encontraron clientes o la respuesta no tiene el formato esperado');
        return {
          data: [],
          total: 0,
          meta: {
            totalItems: 0,
            itemCount: 0,
            itemsPerPage: limit,
            totalPages: 0,
            currentPage: page
          }
        };
      }

      return {
        data: response.data.data,
        total: response.data.meta.total,
        meta: {
          totalItems: response.data.meta.total,
          itemCount: response.data.data.length,
          itemsPerPage: response.data.meta.limit,
          totalPages: response.data.meta.totalPages,
          currentPage: response.data.meta.page
        }
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching clients:', {
        message: axiosError.message,
        response: axiosError.response?.data,
      });
      return {
        data: [],
        total: 0,
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          currentPage: page
        }
      };
    }
  },

  async searchClients(query: string): Promise<Client[]> {
    console.log('Buscando clientes con query:', query);
    try {
      const response = await api.get<Client[]>('/clientes/search', {
        params: { query }
      });
      console.log('Resultados de búsqueda:', response.data);
      return response.data || [];
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      if (axiosError.response?.status === 404) {
        console.log('No se encontraron resultados para la búsqueda');
        return [];
      }
      
      console.error('Error searching clients:', {
        message: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        headers: axiosError.config?.headers
      });
      
      return [];
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
      throw new Error(axiosError.response?.data?.message || 'No se pudo cargar el cliente. Por favor, intente nuevamente.');
    }
  },

  async createClient(clientData: CreateClientDto): Promise<Client> {
    console.log('Creando nuevo cliente con datos:', clientData);
    try {
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
      throw new Error(axiosError.response?.data?.message || 'No se pudo actualizar el cliente. Por favor, intente nuevamente.');
    }
  },

  async deleteClient(id: string): Promise<void> {
    console.log('Eliminando cliente con ID:', id);
    try {
      const response = await api.delete(`/clientes/${id}`);
      console.log('Respuesta del servidor al eliminar:', response);
      if (response.status >= 200 && response.status < 300) {
        console.log('Cliente eliminado exitosamente');
        return;
      }
      throw new Error(`Error inesperado al eliminar: ${response.status} ${response.statusText}`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      // Detallar el error para depuración
      const errorDetails = {
        id,
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        responseData: axiosError.response?.data,
        requestConfig: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          headers: axiosError.config?.headers
        }
      };
      
      console.error('Error detallado al eliminar cliente:', errorDetails);
      
      // Proporcionar un mensaje de error más descriptivo
      let errorMessage = 'No se pudo eliminar el cliente. ';
      
      if (axiosError.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        if (axiosError.response.status === 404) {
          errorMessage = 'El cliente no fue encontrado o ya fue eliminado.';
        } else if (axiosError.response.status === 403) {
          errorMessage = 'No tienes permiso para eliminar este cliente.';
        } else if (axiosError.response.status === 400) {
          errorMessage = 'Solicitud incorrecta. Verifica los datos e inténtalo de nuevo.';
        } else if (axiosError.response.data?.message) {
          errorMessage += `Error: ${axiosError.response.data.message}`;
        } else {
          errorMessage += `Error del servidor (${axiosError.response.status}).`;
        }
      } else if (axiosError.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión a internet.';
      } else {
        // Algo pasó en la configuración de la solicitud
        errorMessage = `Error al configurar la solicitud: ${axiosError.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
};
