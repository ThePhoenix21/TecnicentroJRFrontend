// src/services/service.service.ts
import { api } from './api';
import { AxiosError } from 'axios';
import { Service as ServiceType, CreateServiceDto, UpdateServiceDto, ServiceWithClient } from '@/types/service.types';
import { clientService } from './client.service';

interface IServiceService {
  getServicesWithClients(
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    search?: string
  ): Promise<ServiceWithClient[]>;
  getServices(
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    search?: string
  ): Promise<ServiceType[]>;
  getServiceById(id: string): Promise<ServiceType>;
  createService(serviceData: CreateServiceDto): Promise<ServiceType>;
  updateService(id: string, serviceData: UpdateServiceDto): Promise<ServiceType>;
  deleteService(id: string): Promise<void>;
  updateServiceStatus(
    id: string, 
    status: string
  ): Promise<ServiceType & { allServicesCompleted?: boolean; orderId?: string }>;
}

const serviceService: IServiceService = {
  async getServicesWithClients(status, search) {
    try {
      // First, get the services
      const services = await this.getServices(status, search);
      
      // Then, enrich each service with client information
      const servicesWithClients = await Promise.all(
        services.map(async (service) => {
          if (service.order?.clientId) {
            try {
              const client = await clientService.getClientById(service.order.clientId);
              return {
                ...service,
                client // Add client information to the service
              } as ServiceWithClient;
            } catch (error) {
              console.error(`Error fetching client for service ${service.id}:`, error);
              return service as ServiceWithClient; // Return service without client info if there's an error
            }
          }
          return service as ServiceWithClient; // Return service as is if no clientId is available
        })
      );
      
      console.log('Services with clients:', servicesWithClients);
      return servicesWithClients;
    } catch (error) {
      console.error('Error in getServicesWithClients:', error);
      throw error;
    }
  },
  
  async getServices(status, search) {
    try {
      console.log('Fetching services with params:', { status, search });
      
      const response = await api.get<ServiceType[]>('/services/findAll', {
        params: {
          ...(status && { status }),
          ...(search && { search })
        }
      });
      
      console.log('Services response:', response);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching services:', {
        message: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          params: axiosError.config?.params
        }
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudieron cargar los servicios. Por favor, verifique su conexión e intente nuevamente.');
    }
  },
  
  async getServiceById(id: string) {
    try {
      const response = await api.get<ServiceType>(`/services/findOne/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error in getServiceById:', {
        message: axiosError.message,
        url: axiosError.config?.url,
        status: axiosError.response?.status,
        response: axiosError.response?.data
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudo cargar el servicio.');
    }
  },
  
  async createService(serviceData: CreateServiceDto) {
    try {
      const response = await api.post<ServiceType>('/services', serviceData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'No se pudo crear el servicio.');
    }
  },
  
  async updateService(id: string, serviceData: UpdateServiceDto) {
    try {
      const response = await api.patch<ServiceType>(`/services/${id}`, serviceData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'No se pudo actualizar el servicio.');
    }
  },
  
  async deleteService(id: string) {
    try {
      await api.delete(`/services/${id}`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || 'No se pudo eliminar el servicio.');
    }
  },
  
  async updateServiceStatus(id: string, status: string) {
    try {
      console.log('Updating service status:', { id, status });
      
      // First, get the current service to check the orderId
      const currentService = await this.getServiceById(id);
      console.log('Current service:', { orderId: currentService.orderId, currentStatus: currentService.status });
      
      const orderId = currentService.orderId;
      
      try {
        // Update the service status using the correct endpoint
        console.log('Sending PATCH to:', `/services/update/${id}`);
        const response = await api.patch<ServiceType>(`/services/update/${id}`, { status });
        console.log('Service update response:', response.data);
        
        // If the service was marked as completed, check if we need to update the order status
        if (status === 'COMPLETED' && orderId) {
          try {
            console.log('Checking if we need to update order status for order:', orderId);
            // Get all services for this order
            const services = await this.getServices();
            const orderServices = services.filter(s => s.orderId === orderId);
            console.log(`Found ${orderServices.length} services for order ${orderId}`);
            
            // Check if all services are completed
            const allServicesCompleted = orderServices.every(service => 
              service.id === id || service.status === 'COMPLETED'
            );
            
            console.log('All services completed:', allServicesCompleted);
            
            if (allServicesCompleted && orderServices.length > 0) {
              console.log('Updating order status to COMPLETED');
              // Update the order status to COMPLETED using the correct endpoint
              const orderResponse = await api.patch(`/orders/status/${orderId}`, { status: 'COMPLETED' });
              console.log('Order status update response:', orderResponse.data);
              return { ...response.data, allServicesCompleted: true, orderId };
            }
          } catch (saleUpdateError) {
            console.error('Error updating order status:', saleUpdateError);
            // Don't fail the service update if we can't update the order status
            return { ...response.data, orderUpdateError: 'No se pudo actualizar el estado de la orden' };
          }
        }
        
        return response.data;
      } catch (updateError) {
        const axiosUpdateError = updateError as AxiosError<{ message?: string }>;
        console.error('Error updating service status:', {
          message: axiosUpdateError.message,
          response: axiosUpdateError.response?.data,
          status: axiosUpdateError.response?.status,
          config: {
            url: axiosUpdateError.config?.url,
            method: axiosUpdateError.config?.method,
            data: axiosUpdateError.config?.data,
          },
        });
        throw new Error(axiosUpdateError.response?.data?.message || 'No se pudo actualizar el estado del servicio.');
      }
    } catch (error) {
      console.error('Error in updateServiceStatus:', error);
      throw error; // Re-throw to be handled by the caller
    }
  },
};

export { serviceService };
export type { ServiceType as Service };