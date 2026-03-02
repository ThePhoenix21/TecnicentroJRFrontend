'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { authService, api, type LoginContextPayload, type LoginMode } from '@/services/auth';
import { storeService } from '@/services/store.service';
import { Store } from '@/types/store';
import { CURRENCY_STORAGE_KEY, type SupportedCurrency } from '@/lib/utils';
import {
  tenantService,
  TENANT_DEFAULT_SERVICE_STORAGE_KEY,
  TENANT_FEATURES_STORAGE_KEY,
  type TenantDefaultService,
  type TenantFeature,
} from '@/services/tenant.service';

const CURRENT_STORE_STORAGE_KEY = 'current_store';
const CURRENT_WAREHOUSE_STORAGE_KEY = 'current_warehouse';

// Interfaz simplificada para el contexto de autenticación
export interface AuthStore {
  id: string;
  name: string;
}

export type UserRole = 'User' | 'Admin';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  tenantId?: string;
  tenantName?: string;
  tenantFeatures?: TenantFeature[];
  tenantLogoUrl?: string;
  verified?: boolean;
  stores?: string[]; // 🆕 IDs de tiendas en el JWT
  warehouses?: string[];
  permissions?: string[]; // 🆕 Permisos del usuario
  currency?: SupportedCurrency;
  tenantCurrency?: SupportedCurrency;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;  // Changed from UserRole to string to match backend
  permissions?: string[]; // 🆕 Permisos del usuario
  verified: boolean;
  stores?: AuthStore[];  // Tiendas asociadas al usuario (formato simplificado)
  warehouses?: AuthStore[];  // Almacenes asociados al usuario
  activeLoginMode?: LoginMode | null;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  currentStore: AuthStore | null;
  currentWarehouse: AuthStore | null;
  activeLoginMode: LoginMode | null;
  tenantFeatures: TenantFeature[];
  tenantFeaturesLoaded: boolean;
  tenantDefaultService: TenantDefaultService;
  tenantDefaultServiceLoaded: boolean;
  canIssuePdf: boolean;
  login: (email: string, password: string, context?: LoginContextPayload) => Promise<User | null>;
  logout: (redirect?: boolean) => void;
  selectStore: (store: AuthStore) => Promise<void>;
  selectWarehouse: (warehouse: AuthStore) => Promise<void>;
  refreshStores: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  error: string | null;
  hasStoreSelected: boolean;
  hasWarehouseSelected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<AuthStore | null>(null);
  const [currentWarehouse, setCurrentWarehouse] = useState<AuthStore | null>(null);
  const [activeLoginMode, setActiveLoginMode] = useState<LoginMode | null>(null);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeature[]>([]);
  const [tenantFeaturesLoaded, setTenantFeaturesLoaded] = useState(false);
  const [tenantDefaultService, setTenantDefaultService] = useState<TenantDefaultService>('REPAIR');
  const [tenantDefaultServiceLoaded, setTenantDefaultServiceLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const normalizedTenantFeatures = tenantFeatures.map((feature) => String(feature).toUpperCase());
  const canIssuePdf = tenantFeaturesLoaded && normalizedTenantFeatures.includes('PDFISSUANCE');

  const loadTenantFeatures = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const features = await tenantService.getTenantFeatures();
      setTenantFeatures(features);
      localStorage.setItem(TENANT_FEATURES_STORAGE_KEY, JSON.stringify(features));
    } catch (e) {
      // Fallback a cache local para no romper la UI si el endpoint falla temporalmente
      try {
        const cached = localStorage.getItem(TENANT_FEATURES_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setTenantFeatures(parsed as TenantFeature[]);
        }
      } catch {
        // ignorar
      }
    } finally {
      setTenantFeaturesLoaded(true);
    }
  }, []);

  const loadTenantDefaultService = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const defaultService = await tenantService.getDefaultService();
      setTenantDefaultService(defaultService);
      localStorage.setItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY, defaultService);
    } catch (e) {
      // Fallback a cache local para no romper la UI si el endpoint falla temporalmente
      try {
        const cached = localStorage.getItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY);
        if (cached === 'REPAIR' || cached === 'WARRANTY' || cached === 'MISELANEOUS') {
          setTenantDefaultService(cached);
        }
      } catch {
        // ignorar
      }
    } finally {
      setTenantDefaultServiceLoaded(true);
    }
  }, []);

  const logout = useCallback((redirect: boolean = true) => {
    // Clear all auth related data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('stores_cache'); // Limpiar cache de tiendas
    localStorage.removeItem(CURRENT_STORE_STORAGE_KEY);
    localStorage.removeItem(CURRENT_WAREHOUSE_STORAGE_KEY);
    localStorage.removeItem(TENANT_FEATURES_STORAGE_KEY);
    localStorage.removeItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY);
    localStorage.removeItem(CURRENCY_STORAGE_KEY);
    
    // Clear axios default headers
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common['Authorization'];
    }
    
    // Resetear el estado del usuario y tienda
    setUser(null);
    setCurrentStore(null);
    setCurrentWarehouse(null);
    setActiveLoginMode(null);
    setTenantFeatures([]);
    setTenantFeaturesLoaded(false);
    setTenantDefaultService('REPAIR');
    setTenantDefaultServiceLoaded(false);
    setError(null);
    
    if (redirect) {
      // Redirección única para evitar navegación duplicada y errores transitorios de runtime.
      router.replace('/login');
    }
  }, [router]);

  // Normalize role function
  const normalizeRole = useCallback((role?: string): UserRole => {
    if (!role) return 'User';
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'admin' || lowerRole === 'administrator') return 'Admin';
    return 'User';
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    if (isAdmin) return true; // Admins have all permissions
    // Solo verificar permisos, no usar role para acceso
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  // Función para cargar tiendas reales desde el backend
  const loadRealStores = useCallback(async (): Promise<Store[]> => {
    try {
      const stores = await storeService.getAllStores();
      
      // Guardar en cache para uso futuro
      localStorage.setItem('stores_cache', JSON.stringify(stores));
      return stores;
    } catch (error) {
      return [];
    }
  }, []);

  // Función para obtener tiendas del usuario (reales o del JWT)
  const getUserStores = useCallback(async (userStores: string[]): Promise<AuthStore[]> => {
    // Optimización: si solo hay 1 tienda, no consultar el endpoint de stores.
    // En este caso, el nombre debería venir del login (response.user.stores). Si no hay nombre,
    // usamos un fallback sin llamar al backend.
    if (!userStores || userStores.length <= 1) {
      return (userStores || []).map((storeId: string) => ({
        id: storeId,
        name: `Tienda ${storeId.slice(-8)}`,
      }));
    }

    try {
      // Intentar cargar tiendas reales
      const realStores = await loadRealStores();
      
      if (realStores.length > 0) {
        // Filtrar tiendas que pertenecen al usuario
        const userRealStores = realStores.filter(store => userStores.includes(store.id));
        
        return userRealStores.map(store => ({
          id: store.id,
          name: store.name
        }));
      }
    } catch (error) {
      console.error('Error al obtener tiendas reales, usando fallback:', error);
    }
    
    // Fallback: usar nombres temporales del JWT
    return userStores.map((storeId: string) => ({
      id: storeId,
      name: `Tienda ${storeId.slice(-8)}`
    }));
  }, [loadRealStores]);

  // Función para seleccionar tienda (selección local; no cambia JWT)
  const selectStore = useCallback(async (store: AuthStore) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = {
        ...prev,
        activeLoginMode: 'STORE',
      } as User;
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });

    try {
      localStorage.setItem(CURRENT_STORE_STORAGE_KEY, JSON.stringify(store));
      localStorage.removeItem(CURRENT_WAREHOUSE_STORAGE_KEY);
    } catch {
      // ignorar
    }

    setActiveLoginMode('STORE');
    setCurrentStore(store);
    setCurrentWarehouse(null);

    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  }, [logout]);

  // Función para seleccionar almacén (selección local; no cambia JWT)
  const selectWarehouse = useCallback(async (warehouse: AuthStore) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = {
        ...prev,
        activeLoginMode: 'WAREHOUSE',
      } as User;
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });

    try {
      localStorage.setItem(CURRENT_WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouse));
      localStorage.removeItem(CURRENT_STORE_STORAGE_KEY);
    } catch {
      // ignorar
    }

    setActiveLoginMode('WAREHOUSE');
    setCurrentWarehouse(warehouse);
    setCurrentStore(null);

    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  }, [logout]);

  const refreshStores = useCallback(async () => {
    try {
      const realStores = await loadRealStores();
      if (realStores.length === 0) return;

      setUser((prev) => {
        if (!prev) return prev;

        const isAdminRole = prev.role?.toLowerCase() === 'admin';
        const allowedIds = new Set((prev.stores || []).map((s) => s.id));

        const nextStores = (isAdminRole ? realStores : realStores.filter((s: Store) => allowedIds.has(s.id))).map(
          (store: Store) => ({
            id: store.id,
            name: store.name,
          })
        );

        const nextUser = { ...prev, stores: nextStores };
        localStorage.setItem('user', JSON.stringify(nextUser));
        return nextUser;
      });

      setCurrentStore((prev) => {
        if (!prev) return prev;
        const refreshed = realStores.find((s: Store) => s.id === prev.id);
        if (!refreshed) return prev;
        return { id: refreshed.id, name: refreshed.name };
      });
    } catch (error) {
      console.error('❌ Error refrescando tiendas:', error);
    }
  }, [loadRealStores]);

  const login = async (email: string, password: string, context?: LoginContextPayload): Promise<User | null> => {
    setLoading(true);
    setError(null);
    
    // Basic email validation
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      setLoading(false);
      return null; // Devolver null en caso de error de validación
    }
    
    try {
      // Clear any existing auth state
      localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
      localStorage.removeItem(process.env.NEXT_PUBLIC_USER_KEY || 'user');
      localStorage.removeItem('stores_cache'); // Limpiar cache de tiendas
      
      // Call the auth service
      const response = await authService.login({ email, password }, context);
      
      if (!response.access_token || !response.user) {
        throw new Error('Invalid login response: Missing token or user data');
      }
      
      // Update user state - usar datos de backend como fuente principal
      const jwtToken = response.access_token;
      let jwtStores: AuthStore[] = [];
      let jwtWarehouses: AuthStore[] = [];

      try {
        const decoded = jwtDecode<JwtPayload>(jwtToken);

        const tokenTenantFeatures = Array.isArray(decoded.tenantFeatures) ? decoded.tenantFeatures : [];
        setTenantFeatures(tokenTenantFeatures);
        setTenantFeaturesLoaded(true);

        // Mantener compatibilidad con defaultService cacheado, pero no bloquear el login.
        try {
          const cached = localStorage.getItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY);
          if (cached === 'REPAIR' || cached === 'WARRANTY' || cached === 'MISELANEOUS') {
            setTenantDefaultService(cached);
          }
        } catch {
          // ignorar
        } finally {
          setTenantDefaultServiceLoaded(true);
        }

        const effectiveCurrency = decoded.tenantCurrency ?? decoded.currency;
        if (effectiveCurrency === 'PEN' || effectiveCurrency === 'USD' || effectiveCurrency === 'EUR') {
          localStorage.setItem(CURRENCY_STORAGE_KEY, effectiveCurrency);
        }

        const responseStores = Array.isArray(response.stores)
          ? response.stores
          : (Array.isArray(response.user?.stores) ? response.user.stores : []);
        if (responseStores.length > 0) {
          jwtStores = responseStores.map((s: any) => ({ id: s.id, name: s.name }));
        } else if (decoded.stores && Array.isArray(decoded.stores)) {
          // Solo consultar endpoint de stores si hay múltiples tiendas
          jwtStores = await getUserStores(decoded.stores);
        }

        const responseWarehouses = Array.isArray(response.warehouses)
          ? response.warehouses
          : (Array.isArray(response.user?.warehouses) ? response.user.warehouses : []);
        if (responseWarehouses.length > 0) {
          jwtWarehouses = responseWarehouses.map((w: any) => ({ id: w.id, name: w.name }));
        } else if (decoded.warehouses && Array.isArray(decoded.warehouses)) {
          jwtWarehouses = decoded.warehouses.map((warehouseId: string) => ({
            id: warehouseId,
            name: `Almacén ${warehouseId.slice(-8)}`,
          }));
        }
      } catch (error) {
        console.error('Error al extraer tiendas y almacenes del JWT:', error);
      }
      
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || '',
        role: response.user.role || 'USER',
        permissions: response.user.permissions || [], // 🆕 Permisos del usuario
        verified: response.user.verified || false,
        stores: jwtStores, // Usar tiendas con nombres reales
        warehouses: jwtWarehouses, // Usar almacenes
        activeLoginMode: response.activeLoginMode ?? response.user.activeLoginMode ?? null,
        activeStoreId: response.activeStoreId ?? response.user.activeStoreId ?? null,
        activeWarehouseId: response.activeWarehouseId ?? response.user.activeWarehouseId ?? null,
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setActiveLoginMode(userData.activeLoginMode ?? null);
      
      // Resolver contexto activo según modo devuelto por backend
      if (userData.activeLoginMode === 'STORE' && userData.activeStoreId) {
        const selectedStore = jwtStores.find((s) => s.id === userData.activeStoreId) || null;
        setCurrentStore(selectedStore);
        setCurrentWarehouse(null);
      } else if (userData.activeLoginMode === 'WAREHOUSE' && userData.activeWarehouseId) {
        const selectedWarehouse = jwtWarehouses.find((w) => w.id === userData.activeWarehouseId) || null;
        setCurrentWarehouse(selectedWarehouse);
        setCurrentStore(null);
      } else {
        setCurrentStore(null);
        setCurrentWarehouse(null);
      }
      
      return userData;
      
    } catch (err: unknown) {
      // Clear any partial authentication state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('stores_cache');
      localStorage.removeItem(TENANT_FEATURES_STORAGE_KEY);
      localStorage.removeItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY);
      
      // Handle different error types
      if (err && typeof err === 'object') {
        const error = err as {
          response?: {
            status?: number;
            data?: {
              message?: string;
              error?: string;
            };
          };
          message?: string;
        };
        
        if (error?.response?.status === 401) {
          setError('Correo o contraseña incorrectos');
        } else if (error?.response?.status === 500) {
          setError('Error en el servidor. Por favor, inténtalo de nuevo más tarde.');
        } else if (error?.response?.data?.message) {
          setError(error.response.data.message);
        } else if (error?.message) {
          setError(error.message);
        } else {
          setError('Error al iniciar sesión. Por favor, inténtalo de nuevo.');
        }
      } else {
        setError('Error al iniciar sesión. Por favor, inténtalo de nuevo.');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar la autenticación
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return false;
    }

    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setUser(null);
      setTenantFeatures([]);
      setTenantFeaturesLoaded(false);
      setTenantDefaultService('REPAIR');
      setTenantDefaultServiceLoaded(false);
      setCurrentStore(null);
      setCurrentWarehouse(null);
      try {
        localStorage.removeItem(CURRENT_STORE_STORAGE_KEY);
        localStorage.removeItem(CURRENT_WAREHOUSE_STORAGE_KEY);
      } catch {
        // ignorar
      }
      setLoading(false);
      return false;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token as string);

      const effectiveCurrency = decoded.tenantCurrency ?? decoded.currency;
      if (effectiveCurrency === 'PEN' || effectiveCurrency === 'USD' || effectiveCurrency === 'EUR') {
        localStorage.setItem(CURRENCY_STORAGE_KEY, effectiveCurrency);
      }
      
      const currentTime = Date.now() / 1000;
      const tokenExpiration = decoded.exp || 0;

      // Check if token is expired or about to expire (within 5 seconds)
      if (tokenExpiration < currentTime - 5) {
        // Try to refresh the token
        try {
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            // If refresh is successful, check auth again
            return await checkAuth();
          } else {
            logout(false);
            return false;
          }
        } catch (err) {
          console.error('Failed to refresh token:', err);
          logout(false);
          return false;
        }
      } else {
        // Token is valid, set up the user
        if (!decoded.sub || !decoded.email) {
          console.error('Token structure error:', decoded);
          throw new Error('Token inválido: estructura incorrecta');
        }

        const tokenTenantFeatures = Array.isArray(decoded.tenantFeatures) ? decoded.tenantFeatures : [];
        setTenantFeatures(tokenTenantFeatures);
        setTenantFeaturesLoaded(true);

        // Mantener compatibilidad con defaultService cacheado, pero no bloquear la UI.
        try {
          const cached = localStorage.getItem(TENANT_DEFAULT_SERVICE_STORAGE_KEY);
          if (cached === 'REPAIR' || cached === 'WARRANTY' || cached === 'MISELANEOUS') {
            setTenantDefaultService(cached);
          }
        } catch {
          // ignorar
        } finally {
          setTenantDefaultServiceLoaded(true);
        }
        
        // Get user data from localStorage or use token data
        const storedUser = localStorage.getItem('user');
        let userData: User;
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Lógica robusta para permisos: priorizar token si tiene datos, sino usar localStorage
            const tokenPermissions = decoded.permissions;
            const storedPermissions = parsedUser.permissions;
            const effectivePermissions = (tokenPermissions && tokenPermissions.length > 0) 
              ? tokenPermissions 
              : (storedPermissions || []);

            userData = {
              id: decoded.sub || parsedUser.id,
              email: decoded.email || parsedUser.email,
              name: decoded.name || parsedUser.name || '',
              role: normalizeRole(decoded.role || parsedUser.role),
              permissions: effectivePermissions,
              verified: decoded.verified || parsedUser.verified || false,
              stores: parsedUser.stores || [], // Tiendas del localStorage
              warehouses: parsedUser.warehouses || [], // Almacenes del localStorage
              activeLoginMode: parsedUser.activeLoginMode ?? null,
              iat: decoded.iat,
              exp: decoded.exp
            };
            
          } catch (e) {
            console.error('Error parsing stored user data:', e);
            userData = {
              id: decoded.sub,
              email: decoded.email,
              name: decoded.name || '',
              role: normalizeRole(decoded.role),
              permissions: decoded.permissions || [], // 🆕 Permisos del usuario
              verified: decoded.verified || false,
              stores: [], // Tiendas vacías por defecto
              warehouses: [], // Almacenes vacíos por defecto
              activeLoginMode: null,
              iat: decoded.iat,
              exp: decoded.exp
            };
          }
        } else {
          // No hay usuario en localStorage, crear desde JWT con tiendas reales
          let userStores: AuthStore[] = [];
          if (decoded.stores && Array.isArray(decoded.stores)) {
            // No bloquear el render inicial: usar fallback y resolver nombres reales en background.
            userStores = decoded.stores.map((storeId: string) => ({
              id: storeId,
              name: `Tienda ${storeId.slice(-8)}`,
            }));

            void (async () => {
              const resolved = await getUserStores(decoded.stores as string[]);
              setUser((prev) => {
                if (!prev) return prev;
                if (!Array.isArray(resolved) || resolved.length === 0) return prev;
                const nextUser = { ...prev, stores: resolved };
                try {
                  localStorage.setItem('user', JSON.stringify(nextUser));
                } catch {
                  // ignorar
                }
                return nextUser;
              });
            })();
          }
          
          userData = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || '',
            role: decoded.role || 'USER',
            permissions: decoded.permissions || [], // 🆕 Permisos del usuario
            verified: decoded.verified || false,
            stores: userStores,
            warehouses: [],
            activeLoginMode: null,
            iat: decoded.iat,
            exp: decoded.exp
          };
          // Save user data for future use
          localStorage.setItem('user', JSON.stringify(userData));
        }
        setUser(userData);
        setActiveLoginMode(userData.activeLoginMode ?? null);

        // Restaurar selección local de tienda/almacén tras hard reload.
        try {
          if (userData.activeLoginMode === 'STORE') {
            const rawStore = localStorage.getItem(CURRENT_STORE_STORAGE_KEY);
            if (rawStore) {
              const parsed = JSON.parse(rawStore) as AuthStore;
              if (parsed?.id) {
                setCurrentStore(parsed);
                setCurrentWarehouse(null);
              }
            }
          } else if (userData.activeLoginMode === 'WAREHOUSE') {
            const rawWarehouse = localStorage.getItem(CURRENT_WAREHOUSE_STORAGE_KEY);
            if (rawWarehouse) {
              const parsed = JSON.parse(rawWarehouse) as AuthStore;
              if (parsed?.id) {
                setCurrentWarehouse(parsed);
                setCurrentStore(null);
              }
            }
          } else {
            setCurrentStore(null);
            setCurrentWarehouse(null);
          }
        } catch {
          setCurrentStore(null);
          setCurrentWarehouse(null);
        }

        // Schedule token refresh 1 minute before expiration
        const timeUntilExpire = (tokenExpiration - currentTime - 60) * 1000; // 1 minute before

        if (timeUntilExpire > 0) {
          setTimeout(() => {
            authService.refreshToken().catch((err: unknown) => {
              console.error('Failed to refresh token:', err);
              logout(false);
            });
          }, Math.min(timeUntilExpire, 2147483647));
        }
      }
    } catch (err: unknown) {
      console.error('Error al verificar la autenticación:', err);
      logout(false);
      return false;
    } finally {
      setLoading(false);
    }
    
    return true;
    
  }, [logout, normalizeRole, getUserStores]);

  // Verificar token al cargar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    currentStore,
    currentWarehouse,
    activeLoginMode,
    tenantFeatures,
    tenantFeaturesLoaded,
    tenantDefaultService,
    tenantDefaultServiceLoaded,
    canIssuePdf,
    login,
    logout,
    selectStore,
    selectWarehouse,
    refreshStores,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    hasPermission,
    hasStoreSelected: !!currentStore,
    hasWarehouseSelected: !!currentWarehouse,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
