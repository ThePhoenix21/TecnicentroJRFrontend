import { api } from './api';

export type TenantFeature = string;

export type TenantDefaultService = 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';

export const TENANT_FEATURES_STORAGE_KEY = 'tenant_features';

export const TENANT_DEFAULT_SERVICE_STORAGE_KEY = 'tenant_default_service';

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

  async getStoresCount(): Promise<number> {
    const response = await api.get('/tenant/stores/count');
    const data = response.data as unknown;

    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      const maybeCount = (data as any).count;
      if (typeof maybeCount === 'number' && Number.isFinite(maybeCount)) {
        return maybeCount;
      }
    }

    return 0;
  }

  async getDefaultService(): Promise<TenantDefaultService> {
    const response = await api.get('/tenant/default-service');
    const data = response.data as unknown;

    if (data === 'REPAIR' || data === 'WARRANTY' || data === 'MISELANEOUS') {
      return data;
    }

    return 'REPAIR';
  }
}

export const tenantService = new TenantService();
