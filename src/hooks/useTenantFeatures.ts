import { useAuth } from '@/contexts/auth-context';

/**
 * Hook global para verificar features del tenant.
 * Centraliza la lógica que antes estaba duplicada como helpers inline
 * en app-sidebar, main-layout, user-form y user-edit-form.
 *
 * - hasFeature(feature)  → true si el tenant tiene esa feature activa
 * - hasWarehouse()       → shortcut para hasFeature('WAREHOUSES')
 * - hasFeatures(list)    → true si el tenant tiene TODAS las features del array
 */
export function useTenantFeatures() {
  const { tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalized = (tenantFeatures || []).map((f) => String(f).toUpperCase());

  const hasFeature = (feature: string): boolean => {
    if (!tenantFeaturesLoaded) return true;
    if (normalized.length === 0) return false;
    return normalized.includes(String(feature).toUpperCase());
  };

  const hasWarehouse = (): boolean => hasFeature('WAREHOUSES');

  const hasFeatures = (features: string[]): boolean => {
    if (!tenantFeaturesLoaded) return true;
    return features.every((f) => hasFeature(f));
  };

  return { hasFeature, hasWarehouse, hasFeatures };
}
