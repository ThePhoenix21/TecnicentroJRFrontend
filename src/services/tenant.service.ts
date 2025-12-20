import { api } from './api';

export type TenantFeature = string;

export const TENANT_FEATURES_STORAGE_KEY = 'tenant_features';

class TenantService {
  async getTenantFeatures(): Promise<TenantFeature[]> {
    const response = await api.get('/tenant/features');

    const data = response.data as unknown;

    if (Array.isArray(data)) {
      return data as TenantFeature[];
    }

    if (data && typeof data === 'object' && 'features' in (data as any) && Array.isArray((data as any).features)) {
      return (data as any).features as TenantFeature[];
    }

    return [];
  }
}

export const tenantService = new TenantService();
