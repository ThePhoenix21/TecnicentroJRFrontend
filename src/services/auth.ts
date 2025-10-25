// src/services/auth.ts
// Importar servicios desde archivos centralizados en lugar de duplicar
import { api } from '@/services/api';
import { jwtDecode } from 'jwt-decode';

declare global {
  interface Window {
    refreshTokenTimeout?: NodeJS.Timeout;
    isRefreshing?: boolean;
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  name?: string;
  verified?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    verified: boolean;
  };
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Función auxiliar para obtener token del localStorage
export const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Función auxiliar para obtener token del localStorage
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

// Función auxiliar para obtener refresh token del localStorage
const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Verificar si el token ha expirado
export const isTokenExpired = (token?: string): boolean => {
  if (typeof window === 'undefined') return true;
  const tokenToCheck = token || getToken();
  if (!tokenToCheck) return true;
  
  try {
    const decoded = jwtDecode<JwtPayload>(tokenToCheck);
    const currentTime = Date.now() / 1000;
    return (decoded.exp || 0) < currentTime - 5; // Buffer de 5 segundos
  } catch (error) {
    console.error('Error al verificar expiración del token:', error);
    return true;
  }
};


// Objeto principal del servicio de autenticación con todos los métodos de autenticación
export const authService = {
  // Iniciar sesión con email y contraseña
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('=== Iniciando proceso de login ===');
      console.log('Credenciales:', { email: credentials.email, password: '***' });

      // Limpiar headers de autenticación existentes para asegurar un estado limpio
      delete api.defaults.headers.common['Authorization'];

      // Hacer la solicitud de login sin headers de autenticación
      const response = await api.post<AuthResponse>('/auth/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      console.log('=== Respuesta del servidor ===');
      console.log('Status:', response.status);
      console.log('Datos de respuesta:', response.data);

      const { access_token, refresh_token, user } = response.data;

      if (!access_token || !user) {
        throw new Error('Respuesta de autenticación inválida');
      }

      // Almacenar tokens y datos del usuario
      localStorage.setItem(TOKEN_KEY, access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }

      // Normalize role format (handle both 'ADMIN'/'USER' and 'Admin'/'User')
      const normalizeRole = (role: string): string => {
        if (!role) return 'User'; // Default role
        const lowerRole = role.toLowerCase();
        if (lowerRole === 'admin' || lowerRole === 'administrator') return 'Admin';
        return 'User'; // Default to 'User' for any other role
      };

      const userWithRole = {
        ...user,
        role: normalizeRole(user.role)
      };

      localStorage.setItem(USER_KEY, JSON.stringify(userWithRole));

      // Actualizar la instancia axios por defecto con el nuevo token
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      }

      // Programar renovación de token
      this.scheduleTokenRefresh();

      return response.data;

    } catch (error) {
      console.error('Error en authService.login:', error);
      this.logout();
      throw error;
    }
  },

  // Obtener usuario actual del localStorage o token
  async getCurrentUser() {
    const token = getToken();
    if (!token) return null;

    try {
      // Intentar obtener usuario del localStorage primero
      const userJson = localStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }

      // Alternativa para decodificar token si el usuario no está en localStorage
      const decoded = jwtDecode<JwtPayload>(token);
      const userData = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || '',
        role: decoded.role || 'USER',
        verified: decoded.verified || false
      };

      // Guardar en localStorage para uso futuro
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  },

  // Renovar el token de acceso
  async refreshToken(): Promise<RefreshTokenResponse | null> {
    if (typeof window === 'undefined') return null;

    // Prevenir múltiples intentos de renovación
    if (window.isRefreshing) {
      return new Promise<RefreshTokenResponse | null>((resolve) => {
        const checkRefresh = setInterval(() => {
          if (!window.isRefreshing) {
            clearInterval(checkRefresh);
            const token = getToken();
            if (token) {
              resolve({
                access_token: token,
                refresh_token: getRefreshToken() || '',
                expires_in: 3600
              });
            } else {
              resolve(null);
            }
          }
        }, 100);
      });
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      window.isRefreshing = true;

      // Usar la API centralizada para renovación
      const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken: refreshToken
      });

      const { access_token, refresh_token } = response.data;

      // Actualizar tokens
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Actualizar header de autenticación
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      return response.data;

    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    } finally {
      window.isRefreshing = false;
    }
  },

  // Programar renovación de token antes de la expiración
  scheduleTokenRefresh(): void {
    if (typeof window === 'undefined') return;

    // Limpiar timeout existente
    if (window.refreshTokenTimeout) {
      clearTimeout(window.refreshTokenTimeout);
    }

    const token = getToken();
    if (!token) return;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (!decoded.exp) return;

      // Renovar 1 minuto antes de la expiración
      const expiresIn = (decoded.exp * 1000) - Date.now() - 60000;

      if (expiresIn > 0) {
        window.refreshTokenTimeout = setTimeout(() => {
          this.refreshToken().catch(err => {
            console.error('Error al renovar token:', err);
          });
        }, Math.min(expiresIn, 2147483647)); // Valor máximo de timeout
      }
    } catch (error) {
      console.error('Error al programar renovación de token:', error);
    }
  },

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !isTokenExpired();
  },

  // Cerrar sesión y limpiar todos los datos de autenticación
  logout(): void {
    if (typeof window === 'undefined') return;

    // Limpiar tokens y datos del usuario
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // Limpiar cualquier renovación pendiente
    if (window.refreshTokenTimeout) {
      clearTimeout(window.refreshTokenTimeout);
      delete window.refreshTokenTimeout;
    }

    // Limpiar header de autenticación
    delete api.defaults.headers.common['Authorization'];

    // Redirigir al login si no se está ya allí
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

// Re-exportar api para compatibilidad con el auth-context
export { api };