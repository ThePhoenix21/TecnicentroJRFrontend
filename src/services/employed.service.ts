import { api } from './api';
import type {
  EmployedListItem,
  EmployedDetail,
  CreateEmployedDto,
  UpdateEmployedDto,
  RecreateEmployedDto,
} from '@/types/employed.types';

class EmployedService {
  async getEmployedList(): Promise<EmployedListItem[]> {
    const response = await api.get<EmployedListItem[]>('/employed');
    return response.data;
  }

  async getEmployedById(employedId: string): Promise<EmployedDetail> {
    const response = await api.get<EmployedDetail>(`/employed/${employedId}`);
    return response.data;
  }

  async createEmployed(dto: CreateEmployedDto): Promise<any> {
    const response = await api.post('/employed', dto);
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
