import { api } from './api';

export interface EstablishmentRoleLookupItem {
  id: string;
  name: string;
}

class EstablishmentRoleService {
  async getRolesLookup(): Promise<EstablishmentRoleLookupItem[]> {
    const response = await api.get<EstablishmentRoleLookupItem[]>('/establishment-roles/lookup');
    return response.data;
  }
}

export const establishmentRoleService = new EstablishmentRoleService();
