import { api } from './api';

export interface EmployeePositionLookupItem {
  id: string;
  name: string;
}

class EmployeePositionService {
  async getPositionsLookup(): Promise<EmployeePositionLookupItem[]> {
    const response = await api.get<EmployeePositionLookupItem[]>('/employee-positions/lookup');
    return response.data;
  }
}

export const employeePositionService = new EmployeePositionService();
