// src/services/service.service.ts
import { api } from './api';
import { AxiosError } from 'axios';

// Enums del backend - COMPLETOS
export enum ServiceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED',
  PAID = 'PAID',
  ANNULLATED = 'ANNULLATED',
}

export enum ServiceType {
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  INSPECTION = 'INSPECTION',
  MISELANEOUS = 'MISELANEOUS',
  WARRANTY = 'WARRANTY',
  CUSTOM = 'CUSTOM',
}

// Interfaces basadas en el modelo Prisma
export interface Service {
  id: string;
  type: ServiceType;
  status: ServiceStatus;
  name: string;
  description?: string;
  photoUrls: string[];
  price: number;
  createdAt: string;
  updatedAt: string;
  orderId: string;
}

export interface CreateServiceDto {
  type: ServiceType;
  status: ServiceStatus;
  name: string;
  description?: string;
  photoUrls?: string[];
  price: number;
  orderId: string;
}

export interface UpdateServiceDto {
  type?: ServiceType;
  status?: ServiceStatus;
  name?: string;
  description?: string;
  photoUrls?: string[];
  price?: number;
}

export interface ServiceWithClient {
  id?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  name?: string;
  description?: string;
  photoUrls?: string[];
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  orderId?: string;
  hasPendingPayment?: boolean;
  isFromCurrentCash?: boolean;
  service?: {
    id: string;
    name: string;
  };
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    dni?: string;
    createdAt?: string;
  };
  store?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
    createdById: string | null;
  };
  order?: {
    id: string;
    clientId: string;
    storeId?: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    cashSessionsId?: string;
    cashSession?: {
      id: string;
      status: "OPEN" | "CLOSED";
    };
  };
}

export interface ServiceLookupItem {
  id: string;
  value: string;
}

export interface ServiceListItem {
  id: string;
  clientName: string;
  serviceName: string;
  status: ServiceStatus;
  price: number;
  createdAt: string;
  hasPendingPayment?: boolean;
  isFromCurrentCash?: boolean;
}

export interface ServiceListResponse {
  data: ServiceListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

interface FindAllWithClientsPagedResponse {
  data: Array<{
    clientId?: string;
    clientName?: string;
    serviceId?: string;
    serviceName?: string;
    status?: ServiceStatus;
    price?: number;
    createdAt?: string;
    hasPendingPayment?: boolean;
    isFromCurrentCash?: boolean;
  }>;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface GetServicesFilters {
  page?: number;
  pageSize?: number;
  status?: ServiceStatus;
  openCashOnly?: boolean;
  fromDate?: string;
  toDate?: string;
  clientId?: string;
  serviceId?: string;
  clientName?: string;
  serviceName?: string;
  storeId?: string;
}

export interface ServiceDetail {
  // Relaciones principales
  service: {
    id: string;
    name: string;
    description: string;
    photoUrls: string[];
    type: ServiceType;
    status: ServiceStatus;
    price: number;
    createdAt: string;
    updatedAt: string;
  };

  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    isPriceModified: boolean;
    createdAt: string;
    updatedAt: string;
    canceledAt: string | null;
    storeName: string;
    paymentMethods: Array<{
      type: string;
      amount: number;
      createdAt: string;
    }>;
  };

  client: {
    id: string;
    name: string;
    dni: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };

  storeService: {
    id: string;
    name: string;
    description: string;
    price: number;
    type: ServiceType;
  };

  serviceCategory: {
    id: string;
    name: string;
  };
}

interface IServiceService {
  getServicesWithClients(
    status?: ServiceStatus,
    type?: ServiceType,
    storeId?: string
  ): Promise<ServiceWithClient[]>;
  getServicesPaged(filters?: GetServicesFilters): Promise<ServiceListResponse>;
  getServicesLookup(): Promise<ServiceLookupItem[]>;
  getServiceDetail(id: string): Promise<ServiceDetail>;
  getServices(
    status?: ServiceStatus,
    type?: ServiceType
  ): Promise<Service[]>;
  getServiceById(id: string): Promise<Service>;
  createService(serviceData: CreateServiceDto): Promise<Service>;
  updateService(id: string, serviceData: UpdateServiceDto): Promise<Service>;
  deleteService(id: string): Promise<void>;
  updateServiceStatus(id: string, status: ServiceStatus): Promise<Service>;
  getServicePendingPayment(id: string): Promise<{
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    totalPaid: number;
    pendingAmount: number;
    isFullyPaid: boolean;
    paymentBreakdown: Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: string;
    }>;
  }>;
  isServiceFullyPaid(id: string): Promise<boolean>;
  getServicePendingAmount(id: string): Promise<number>;
}

class ServiceService implements IServiceService {
  private baseUrl = '/services';

  private normalizeDateFilter(dateValue: string, endOfDay = false): string {
    const trimmed = dateValue.trim();
    if (!trimmed) return trimmed;

    if (trimmed.includes('T')) {
      return trimmed;
    }

    return `${trimmed}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`;
  }

  private toFriendlyError(error: unknown, fallbackMessage: string): Error {
    const axiosError = error as AxiosError<{ message?: string }>;
    const status = axiosError.response?.status;

    if (status === 429) {
      return new Error('Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.');
    }
    if (status === 409) {
      return new Error('La operación no se pudo completar porque el estado cambió. Actualiza e inténtalo nuevamente.');
    }

    return new Error(axiosError.response?.data?.message || fallbackMessage);
  }

  async getServicesPaged(filters: GetServicesFilters = {}): Promise<ServiceListResponse> {
    try {
      if (!filters.storeId) {
        throw new Error('storeId es obligatorio para listar servicios');
      }

      const params = new URLSearchParams();
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 12;

      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (filters.status) params.append('status', filters.status);
      params.append('storeId', filters.storeId);
      if (filters.clientName) params.append('clientName', filters.clientName);
      if (filters.serviceName) params.append('serviceName', filters.serviceName);
      if (filters.fromDate) params.append('fromDate', this.normalizeDateFilter(filters.fromDate, false));
      if (filters.toDate) params.append('toDate', this.normalizeDateFilter(filters.toDate, true));

      if (filters.openCashOnly) {
        params.append('openCashOnly', 'true');
      }

      const url = params.toString()
        ? `${this.baseUrl}?${params.toString()}`
        : `${this.baseUrl}`;

      const response = await api.get<ServiceListResponse | FindAllWithClientsPagedResponse | ServiceWithClient[]>(url);

      // Nuevo contrato (paginado por backend)
      if (!Array.isArray(response.data)) {
        const payload = response.data as any;

        if (Array.isArray(payload.data) && (typeof payload.totalPages === 'number' || typeof payload.total === 'number')) {
          return {
            data: (payload.data || []).map((item: any, idx: number) => ({
              id: item.id || item.serviceId || '',
              clientName: item.clientName || 'Sin cliente',
              serviceName: item.serviceName || 'Servicio sin nombre',
              status: (item.status || ServiceStatus.PENDING) as ServiceStatus,
              price: Number(item.price ?? 0),
              createdAt: item.createdAt || '',
              hasPendingPayment: item.hasPendingPayment,
              isFromCurrentCash: item.isFromCurrentCash,
            })),
            total: payload.total ?? 0,
            totalPages: payload.totalPages ?? 1,
            page: payload.page ?? page,
            pageSize: payload.pageSize ?? pageSize,
          };
        }

        return {
          data: [],
          total: 0,
          totalPages: 1,
          page,
          pageSize,
        };
      }

      // Compatibilidad con contrato antiguo (array)
      let all = response.data || [];

      all.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

      if (filters.clientId) {
        all = all.filter((s) => s.client?.id === filters.clientId);
      }
      if (filters.serviceId) {
        all = all.filter((s) => (s.service?.id || s.id) === filters.serviceId);
      }

      const start = (page - 1) * pageSize;
      const paginated = all.slice(start, start + pageSize);

      return {
        data: paginated.map((s) => ({
          id: s.service?.id || s.id || '',
          clientName: s.client?.name ?? 'Sin cliente',
          serviceName: s.service?.name || s.name || 'Servicio sin nombre',
          status: (s.status || ServiceStatus.PENDING) as ServiceStatus,
          price: Number(s.price ?? 0),
          createdAt: s.createdAt || '',
          hasPendingPayment: s.hasPendingPayment,
          isFromCurrentCash: s.isFromCurrentCash,
        })),
        total: all.length,
        totalPages: Math.ceil(all.length / pageSize),
        page,
        pageSize,
      };
    } catch (error) {
      throw this.toFriendlyError(error, 'No se pudieron cargar los servicios.');
    }
  }

  async getServicesLookup(): Promise<ServiceLookupItem[]> {
    try {
      const response = await api.get<ServiceLookupItem[]>(`${this.baseUrl}/lookup`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      throw this.toFriendlyError(error, 'No se pudo cargar la lista de servicios.');
    }
  }

  async getServiceDetail(id: string): Promise<ServiceDetail> {
    try {
      const response = await api.get<ServiceDetail>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 404) {
        const fallback = await api.get<ServiceDetail>(`${this.baseUrl}/findOne/${id}`);
        return fallback.data;
      }
      throw this.toFriendlyError(error, 'No se pudo cargar el detalle del servicio.');
    }
  }

  // Obtener servicios con clientes y tiendas (usando nuevo endpoint del backend)
  async getServicesWithClients(
    status?: ServiceStatus,
    type?: ServiceType,
    storeId?: string
  ): Promise<ServiceWithClient[]> {
    try {
      if (!storeId) {
        throw new Error('storeId es obligatorio para listar servicios');
      }

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      params.append('storeId', storeId);

      const url = params.toString()
        ? `${this.baseUrl}?${params.toString()}`
        : `${this.baseUrl}`;

      const response = await api.get<ServiceListResponse | FindAllWithClientsPagedResponse | ServiceWithClient[]>(url);

      if (Array.isArray(response.data)) {
        return response.data;
      }

      const payload = response.data as any;
      const items = Array.isArray(payload?.data) ? payload.data : [];

      return items.map((item: any, idx: number) => ({
        id: item.id || item.serviceId || '',
        status: item.status,
        price: item.price,
        createdAt: item.createdAt,
        isFromCurrentCash: item.isFromCurrentCash,
        service: item.id || item.serviceId || item.serviceName
          ? {
              id: item.id || item.serviceId || '',
              name: item.serviceName || item.name || 'Servicio sin nombre',
            }
          : undefined,
        client: item.clientId || item.clientName
          ? {
              id: item.clientId || '',
              name: item.clientName || 'Sin cliente',
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Error en getServicesWithClients:', error);
      throw error;
    }
  }

  async getServices(status?: ServiceStatus, type?: ServiceType): Promise<Service[]> {
    try {
      const response = await api.get<Service[]>(`${this.baseUrl}/findAll`, {
        params: {
          ...(status && { status }),
          ...(type && { type }),
        },
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching services:', {
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudieron cargar los servicios.');
    }
  }

  async getServiceById(id: string): Promise<Service> {
    try {
      const response = await api.get<Service>(`${this.baseUrl}/findOne/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error in getServiceById:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudo cargar el servicio.');
    }
  }

  async createService(serviceData: CreateServiceDto): Promise<Service> {
    try {
      if (!serviceData.type) throw new Error('El tipo de servicio es obligatorio');
      if (!serviceData.status) throw new Error('El estado del servicio es obligatorio');
      if (!serviceData.name) throw new Error('El nombre del servicio es obligatorio');
      if (!serviceData.price) throw new Error('El precio del servicio es obligatorio');
      if (!serviceData.orderId) throw new Error('El ID de la orden es obligatorio');

      const response = await api.post<Service>(`${this.baseUrl}/create`, serviceData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error creating service:', {
        error: axiosError.message,
        response: axiosError.response?.data,
        requestData: serviceData,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudo crear el servicio.');
    }
  }

  async updateService(id: string, serviceData: UpdateServiceDto): Promise<Service> {
    try {
      const response = await api.patch<Service>(`${this.baseUrl}/update/${id}`, serviceData);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error updating service:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
        requestData: serviceData,
      });
      throw new Error(axiosError.response?.data?.message || 'No se pudo actualizar el servicio.');
    }
  }

  async deleteService(id: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/remove/${id}`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error deleting service:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
      });

      let errorMessage = 'No se pudo eliminar el servicio. ';

      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          errorMessage = 'El servicio no fue encontrado o ya fue eliminado.';
        } else if (axiosError.response.status === 403) {
          errorMessage = 'No tienes permiso para eliminar este servicio (solo ADMIN puede eliminar).';
        } else if (axiosError.response.status === 409) {
          errorMessage = 'No se puede eliminar el servicio porque tiene registros asociados.';
        } else if (axiosError.response.data?.message) {
          errorMessage += `Error: ${axiosError.response.data.message}`;
        } else {
          errorMessage += `Error del servidor (${axiosError.response.status}).`;
        }
      }

      throw new Error(errorMessage);
    }
  }

  async updateServiceStatus(id: string, status: ServiceStatus): Promise<Service> {
    try {
      const allowedStatuses: ServiceStatus[] = [
        ServiceStatus.IN_PROGRESS,
        ServiceStatus.COMPLETED,
        ServiceStatus.DELIVERED,
        ServiceStatus.PAID,
        ServiceStatus.ANNULLATED,
      ];

      if (!allowedStatuses.includes(status)) {
        throw new Error(`Estado no válido. Los estados permitidos son: ${allowedStatuses.join(', ')}`);
      }

      const response = await api.patch<Service>(`${this.baseUrl}/status/${id}`, { status });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error updating service status:', {
        id,
        status,
        error: axiosError.message,
        response: axiosError.response?.data,
      });

      if (axiosError.response?.status === 409) {
        throw new Error('Estado inválido o desactualizado. Actualiza e inténtalo nuevamente.');
      }

      if (axiosError.response?.status === 429) {
        throw new Error('Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.');
      }

      if (axiosError.response?.status === 404) {
        throw new Error('Servicio no encontrado');
      } else if (axiosError.response?.status === 403) {
        throw new Error('No tienes permisos para cambiar el estado de este servicio');
      } else if (axiosError.response?.status === 400) {
        const backendMessage = axiosError.response.data?.message;
        if (backendMessage?.includes('Estado no válido')) {
          throw new Error('Estado no válido. Los estados permitidos son: IN_PROGRESS, COMPLETED, DELIVERED, PAID, ANNULLATED');
        }
        throw new Error(backendMessage || 'Datos inválidos');
      }

      throw new Error(axiosError.response?.data?.message || 'No se pudo actualizar el estado del servicio');
    }
  }

  async getServicePendingPayment(id: string): Promise<{
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    totalPaid: number;
    pendingAmount: number;
    isFullyPaid: boolean;
    paymentBreakdown: Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: string;
    }>;
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}/pending-payment`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error getting service pending payment:', {
        id,
        error: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
      });

      if (axiosError.response?.status === 429) {
        throw new Error('Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.');
      }

      if (axiosError.response?.status === 404) {
        throw new Error('Servicio no encontrado');
      } else if (axiosError.response?.status === 403) {
        throw new Error('No tienes permisos para ver el estado de pago de este servicio');
      } else if (axiosError.response?.status === 400) {
        const backendMessage = axiosError.response.data?.message;
        if (backendMessage?.includes('Validation failed')) {
          throw new Error('ID de servicio inválido');
        }
        throw new Error(backendMessage || 'Datos inválidos');
      }

      throw new Error(axiosError.response?.data?.message || 'No se pudo obtener el estado de pago del servicio');
    }
  }

  async isServiceFullyPaid(id: string): Promise<boolean> {
    try {
      const paymentInfo = await this.getServicePendingPayment(id);
      return paymentInfo.isFullyPaid;
    } catch (error) {
      console.error('Error checking if service is fully paid:', error);
      return false;
    }
  }

  async getServicePendingAmount(id: string): Promise<number> {
    try {
      const paymentInfo = await this.getServicePendingPayment(id);
      return paymentInfo.pendingAmount;
    } catch (error) {
      console.error('Error getting service pending amount:', error);
      return 0;
    }
  }
}

export const serviceService = new ServiceService();
