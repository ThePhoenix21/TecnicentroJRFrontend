'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { authService, api } from '@/services/auth';
import { userService } from '@/services/user.service';
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
  verified?: boolean;
  stores?: string[]; // 🆕 IDs de tiendas en el JWT
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
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  currentStore: AuthStore | null;
  tenantFeatures: TenantFeature[];
  tenantFeaturesLoaded: boolean;
  tenantDefaultService: TenantDefaultService;
  tenantDefaultServiceLoaded: boolean;
  canIssuePdf: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  selectStore: (store: AuthStore) => void;
  refreshStores: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  error: string | null;
  hasStoreSelected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<AuthStore | null>(null);
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
    console.log('Logging out...');
    // Clear all auth related data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('current_store'); // Limpiar tienda seleccionada
    localStorage.removeItem('stores_cache'); // Limpiar cache de tiendas
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
    setTenantFeatures([]);
    setTenantFeaturesLoaded(false);
    setTenantDefaultService('REPAIR');
    setTenantDefaultServiceLoaded(false);
    setError(null);
    
    if (redirect) {
      // Redirigir a la página de login
      router.push('/login');
      
      // Forzar un recargue completo para limpiar cualquier estado de la aplicación
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
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
    if (!user) return false;
    // Admins always have all permissions, but we can also check the array if strictly needed.
    // However, per requirements, admin implies full access.
    if (user.role?.toLowerCase() === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  // Función para cargar tiendas reales desde el backend
  const loadRealStores = useCallback(async (): Promise<Store[]> => {
    try {
      console.log('🏪 Cargando tiendas reales desde el backend...');
      const stores = await storeService.getAllStores();
      console.log('✅ Tiendas reales cargadas:', stores);
      
      // Guardar en cache para uso futuro
      localStorage.setItem('stores_cache', JSON.stringify(stores));
      return stores;
    } catch (error) {
      console.error('❌ Error al cargar tiendas reales:', error);
      return [];
    }
  }, []);

  // Función para obtener tiendas del usuario (reales o del JWT)
  const getUserStores = useCallback(async (userStores: string[]): Promise<AuthStore[]> => {
    try {
      // Intentar cargar tiendas reales
      const realStores = await loadRealStores();
      
      if (realStores.length > 0) {
        // Filtrar tiendas que pertenecen al usuario
        const userRealStores = realStores.filter(store => userStores.includes(store.id));
        console.log('🏪 Tiendas reales del usuario:', userRealStores);
        
        return userRealStores.map(store => ({
          id: store.id,
          name: store.name
        }));
      }
    } catch (error) {
      console.error('Error al obtener tiendas reales, usando fallback:', error);
    }
    
    // Fallback: usar nombres temporales del JWT
    console.log('🔄 Usando fallback de tiendas del JWT');
    return userStores.map((storeId: string) => ({
      id: storeId,
      name: `Tienda ${storeId.slice(-8)}`
    }));
  }, [loadRealStores]);

  // Función para seleccionar tienda
  const selectStore = useCallback((store: AuthStore) => {
    console.log('🏪 Seleccionando tienda:', store);
    setCurrentStore(store);
    localStorage.setItem('current_store', JSON.stringify(store));
    console.log('✅ Tienda guardada en localStorage y estado actualizado');
  }, []);

  const refreshStores = useCallback(async () => {
    try {
      const realStores = await loadRealStores();
      if (realStores.length === 0) return;

      setUser((prev) => {
        if (!prev) return prev;

        const isAdminRole = prev.role?.toLowerCase() === 'admin';
        const allowedIds = new Set((prev.stores || []).map((s) => s.id));

        const nextStores = (isAdminRole ? realStores : realStores.filter((s) => allowedIds.has(s.id))).map(
          (store) => ({
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
        const refreshed = realStores.find((s) => s.id === prev.id);
        if (!refreshed) return prev;
        const next = { id: refreshed.id, name: refreshed.name };
        localStorage.setItem('current_store', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('❌ Error refrescando tiendas:', error);
    }
  }, [loadRealStores]);

  const login = async (email: string, password: string): Promise<User | null> => {
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
      localStorage.removeItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'refresh_token');
      localStorage.removeItem(process.env.NEXT_PUBLIC_USER_KEY || 'user');
      localStorage.removeItem('current_store'); // Limpiar tienda anterior
      localStorage.removeItem('stores_cache'); // Limpiar cache de tiendas
      
      // Call the auth service
      const response = await authService.login({ email, password });
      
      if (!response.access_token || !response.user) {
        throw new Error('Invalid login response: Missing token or user data');
      }
      
      // Update user state - obtener tiendas reales
      const jwtToken = response.access_token;
      let jwtStores: AuthStore[] = [];
      
      // Extraer tiendas del JWT si existen
      try {
        console.log('JWT Token:', jwtToken);
        const decoded = jwtDecode(jwtToken) as any;
        console.log('JWT Decoded:', decoded);

        const effectiveCurrency = decoded.tenantCurrency ?? decoded.currency;
        if (effectiveCurrency === 'PEN' || effectiveCurrency === 'USD' || effectiveCurrency === 'EUR') {
          localStorage.setItem(CURRENCY_STORAGE_KEY, effectiveCurrency);
        }
        
        if (decoded.stores && Array.isArray(decoded.stores)) {
          // El JWT tiene IDs de tiendas, obtener los nombres reales
          console.log('Tiendas en JWT:', decoded.stores);
          
          // Obtener tiendas reales usando los IDs del JWT
          jwtStores = await getUserStores(decoded.stores);
          console.log('Tiendas procesadas con nombres reales:', jwtStores);
        } else {
          console.log('No hay tiendas en el JWT o no es array');
        }
      } catch (error) {
        console.error('Error al extraer tiendas del JWT:', error);
      }
      
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || '',
        role: response.user.role || 'USER',
        permissions: response.user.permissions || [], // 🆕 Permisos del usuario
        verified: response.user.verified || false,
        stores: jwtStores, // Usar tiendas con nombres reales
      };
      
      console.log('UserData creado con tiendas reales:', userData);
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Cargar features del tenant después de login
      await loadTenantFeatures();

      // Cargar defaultService del tenant después de login
      await loadTenantDefaultService();
      
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      // Para usuarios USER con una sola tienda, seleccionarla automáticamente
      if (userData.role.toLowerCase() === 'user' && jwtStores.length === 1) {
        console.log('🏪 Usuario USER con una sola tienda, seleccionando automáticamente');
        setCurrentStore(jwtStores[0]);
        localStorage.setItem('current_store', JSON.stringify(jwtStores[0]));
      }
      
      return userData;
      
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Clear any partial authentication state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('current_store');
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
    console.log('Checking auth with token:', token);
    
    if (!token) {
      console.log('No token found, user is not authenticated');
      setUser(null);
      setTenantFeatures([]);
      setTenantFeaturesLoaded(false);
      setTenantDefaultService('REPAIR');
      setTenantDefaultServiceLoaded(false);
      setLoading(false);
      return false;
    }

    try {
      console.log('Decoding token...');
      const decoded = jwtDecode<JwtPayload>(token as string);
      console.log('Decoded token:', decoded);

      const effectiveCurrency = decoded.tenantCurrency ?? decoded.currency;
      if (effectiveCurrency === 'PEN' || effectiveCurrency === 'USD' || effectiveCurrency === 'EUR') {
        localStorage.setItem(CURRENCY_STORAGE_KEY, effectiveCurrency);
      }
      
      const currentTime = Date.now() / 1000;
      const tokenExpiration = decoded.exp || 0;

      console.log('Current time:', new Date(currentTime * 1000));
      console.log('Token expires at:', new Date(tokenExpiration * 1000));

      // Check if token is expired or about to expire (within 5 seconds)
      if (tokenExpiration < currentTime - 5) {
        console.log('Token expired, attempting to refresh...');
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
              iat: decoded.iat,
              exp: decoded.exp
            };
            
            // Si no hay tiendas en localStorage pero sí en JWT, actualizar
            if ((!userData.stores || userData.stores.length === 0) && decoded.stores) {
              console.log('Actualizando tiendas desde JWT en checkAuth...');
              const userRealStores = await getUserStores(decoded.stores);
              userData.stores = userRealStores;
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('Usuario actualizado con tiendas reales:', userData);
            }
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
              iat: decoded.iat,
              exp: decoded.exp
            };
          }
        } else {
          // No hay usuario en localStorage, crear desde JWT con tiendas reales
          let userStores: AuthStore[] = [];
          if (decoded.stores && Array.isArray(decoded.stores)) {
            userStores = await getUserStores(decoded.stores);
          }
          
          userData = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || '',
            role: decoded.role || 'USER',
            permissions: decoded.permissions || [], // 🆕 Permisos del usuario
            verified: decoded.verified || false,
            stores: userStores,
            iat: decoded.iat,
            exp: decoded.exp
          };
          // Save user data for future use
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        console.log('User authenticated:', userData);
        console.log('📊 UserData stores:', userData.stores);
        console.log('📊 UserData role:', userData.role);
        setUser(userData);

        // Cargar features del tenant al restaurar sesión
        await loadTenantFeatures();

        // Cargar defaultService del tenant al restaurar sesión
        await loadTenantDefaultService();

        // Recuperar tienda seleccionada del localStorage
        const savedStore = localStorage.getItem('current_store');
        if (savedStore) {
          try {
            const storeData = JSON.parse(savedStore);
            console.log('Tienda recuperada:', storeData);
            setCurrentStore(storeData);
          } catch (error) {
            console.error('Error al recuperar tienda seleccionada:', error);
            localStorage.removeItem('current_store');
          }
        } else if (userData.role.toLowerCase() === 'user' && userData.stores && userData.stores.length > 0) {
          // Para usuarios USER, seleccionar automáticamente la primera tienda
          console.log('🏪 Usuario USER sin tienda seleccionada');
          console.log('📋 Tiendas disponibles:', userData.stores);
          console.log('✅ Usando primera tienda:', userData.stores[0]);
          setCurrentStore(userData.stores[0]);
          // Guardar en localStorage para futuras sesiones
          localStorage.setItem('current_store', JSON.stringify(userData.stores[0]));
        } else {
          console.log('❌ No se pudo seleccionar tienda automáticamente:', {
            role: userData.role,
            hasStores: !!userData.stores,
            storesLength: userData.stores?.length || 0
          });
        }

        // Schedule token refresh 1 minute before expiration
        const timeUntilExpire = (tokenExpiration - currentTime - 60) * 1000; // 1 minute before
        console.log(`Token will expire in ${Math.floor(timeUntilExpire / 1000)} seconds`);

        if (timeUntilExpire > 0) {
          setTimeout(() => {
            console.log('Refreshing token before expiration...');
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
    tenantFeatures,
    tenantFeaturesLoaded,
    tenantDefaultService,
    tenantDefaultServiceLoaded,
    canIssuePdf,
    login,
    logout,
    selectStore,
    refreshStores,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    hasPermission,
    hasStoreSelected: !!currentStore,
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
