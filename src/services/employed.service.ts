import { api } from './api';
import type {
  EmployedListItem,
  EmployedDetail,
  CreateEmployedDto,
  UpdateEmployedDto,
  RecreateEmployedDto,
  EmployedFilters,
  EmployedPositionLookupItem,
  EmployedStatusLookupItem,
  EmployedNameLookupItem,
} from '@/types/employed.types';

class EmployedService {
  async getEmployedList(filters: EmployedFilters = {}): Promise<EmployedListItem[]> {
    const response = await api.get<EmployedListItem[]>('/employed', { params: filters });
    return response.data;
  }

  async getPositionsLookup(): Promise<EmployedPositionLookupItem[]> {
    const response = await api.get<EmployedPositionLookupItem[]>('/employed/lookup-position');
    return response.data;
  }

  async getStatusLookup(): Promise<EmployedStatusLookupItem[]> {
    const response = await api.get<EmployedStatusLookupItem[]>('/employed/lookup-status');
    return response.data;
  }

  async getEmployedLookup(): Promise<EmployedNameLookupItem[]> {
    const response = await api.get<EmployedNameLookupItem[]>('/employed/lookup');
    return response.data;
  }

  async getEmployedById(employedId: string): Promise<EmployedDetail> {
    const response = await api.get<EmployedDetail>(`/employed/${employedId}`);
    return response.data;
  }

  async bulkUpdateStatus(ids: string[], status: string, reason: string) {
    const response = await api.post('/employed/bulk/status', {
      ids,
      status,
      reason,
    });
    return response.data;
  }

  async createEmployed(dto: CreateEmployedDto, documents?: File[]): Promise<any> {
    const payload = {
      ...dto,
      phone: dto.phone || undefined,
      email: dto.email || undefined,
      storeId: dto.storeId || undefined,
      warehouseId: dto.warehouseId || undefined,
    };

    const hasDocuments = Array.isArray(documents) && documents.length > 0;
    if (!hasDocuments) {
      const response = await api.post('/employed', payload);
      return response.data;
    }

    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    for (const file of documents) {
      formData.append('documents', file);
    }

    const response = await api.post('/employed', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateEmployed(employedId: string, dto: UpdateEmployedDto): Promise<EmployedDetail> {
    const response = await api.patch<EmployedDetail>(`/employed/${employedId}`, dto);
    return response.data;
  }

  async recreateEmployed(employedId: string, dto: RecreateEmployedDto): Promise<any> {
    const response = await api.post(`/employed/${employedId}/recreate`, dto);
    return response.data;
  }

  async getDeletedEmployed(): Promise<EmployedDetail[]> {
    const response = await api.get<EmployedDetail[]>('/employed/deleted');
    return response.data;
  }
}

export const employedService = new EmployedService();
