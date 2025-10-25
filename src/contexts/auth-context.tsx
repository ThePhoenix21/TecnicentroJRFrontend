'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { authService, api } from '@/services/auth';

export type UserRole = 'User' | 'Admin';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  verified?: boolean;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;  // Changed from UserRole to string to match backend
  verified: boolean;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const logout = useCallback((redirect: boolean = true) => {
    console.log('Logging out...');
    // Clear all auth related data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Clear axios default headers
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common['Authorization'];
    }
    
    // Resetear el estado del usuario
    setUser(null);
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
      setLoading(false);
      return false;
    }

    try {
      console.log('Decoding token...');
      const decoded = jwtDecode<JwtPayload>(token as string);
      console.log('Decoded token:', decoded);
      
      const currentTime = Date.now() / 1000;
      const tokenExpiration = decoded.exp || 0;

      console.log('Current time:', new Date(currentTime * 1000));
      console.log('Token expires at:', new Date(tokenExpiration * 1000));

      // Check if token is expired or about to expire (within 5 seconds)
      if (tokenExpiration < currentTime - 5) {
        console.log('Token expired, attempting to refresh...');
        // Try to refresh the token
        authService.refreshToken()
          .then(() => {
            // If refresh is successful, check auth again
            checkAuth();
          })
          .catch((err) => {
            console.error('Failed to refresh token:', err);
            logout(false);
            return false;
          });
        return false;
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
            userData = {
              id: parsedUser.id || decoded.sub,
              email: parsedUser.email || decoded.email,
              name: parsedUser.name || decoded.name || '',
              role: normalizeRole(parsedUser.role || decoded.role),
              verified: parsedUser.verified || decoded.verified || false,
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
              verified: decoded.verified || false,
              iat: decoded.iat,
              exp: decoded.exp
            };
          }
        } else {
          userData = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || '',
            role: decoded.role || 'USER',
            verified: decoded.verified || false,
            iat: decoded.iat,
            exp: decoded.exp
          };
          // Save user data for future use
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        console.log('User authenticated:', userData);
        setUser(userData);

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
    
    return true; // Added missing return statement
    
  }, [logout, normalizeRole]); // Removed checkAuth from dependencies

  // Verificar token al cargar
  useEffect(() => {
    setLoading(true);
    
    const verifyAuth = async () => {
      try {
        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('auth_token');
        console.log('Initial auth check with token:', token);
        
        if (token) {
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp && decoded.exp > currentTime) {
              // Token is valid, set up user
              const currentUser = await authService.getCurrentUser();
              if (currentUser) {
                setUser({
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.name || '',
                  role: currentUser.role || 'User',
                  verified: currentUser.verified || false
                });
                // Schedule token refresh only if token won't expire soon
                const timeUntilExpire = (decoded.exp - currentTime - 60) * 1000;
                if (timeUntilExpire > 60000) { // Only schedule if more than 1 minute left
                  setTimeout(() => {
                    authService.refreshToken().catch(console.error);
                  }, Math.min(timeUntilExpire, 2147483647));
                }
              }
            } else {
              // Token expired, try to refresh
              console.log('Token expired, attempting refresh...');
              try {
                const refreshed = await authService.refreshToken();
                if (refreshed) {
                  // Refresh successful, get current user again
                  const currentUser = await authService.getCurrentUser();
                  if (currentUser) {
                    setUser({
                      id: currentUser.id,
                      email: currentUser.email,
                      name: currentUser.name || '',
                      role: currentUser.role || 'User',
                      verified: currentUser.verified || false
                    });
                  }
                } else {
                  // Refresh failed, logout
                  logout(false);
                }
              } catch (refreshError) {
                console.error('Refresh failed:', refreshError);
                logout(false);
              }
            }
          } catch (error) {
            console.error('Error during token verification:', error);
            logout(false);
          }
        }
      } catch (error) {
        console.error('Error during initial auth check:', error);
        logout(false);
      } finally {
        setLoading(false);
      }
    };
    
    verifyAuth();
  }, [logout]); // Only include stable dependencies

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    // Basic email validation
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      setLoading(false);
      return false;
    }
    
    try {
      // Clear any existing auth state
      localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
      localStorage.removeItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'refresh_token');
      localStorage.removeItem(process.env.NEXT_PUBLIC_USER_KEY || 'user');
      
      // Call the auth service
      const response = await authService.login({ email, password });
      
      if (!response.access_token || !response.user) {
        throw new Error('Invalid login response: Missing token or user data');
      }
      
      // Update user state
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || '',
        role: response.user.role || 'USER',
        verified: response.user.verified || false,
      });
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      // Create user data
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || '',
        role: response.user.role || 'USER',
        verified: response.user.verified || false
      };
      
      // Update state and storage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Schedule token refresh (using default 1 hour if not provided)
      const expiresIn = response.expires_in || 3600;
      setTimeout(() => {
        authService.refreshToken().catch((err: Error) => {
          console.error('Failed to refresh token:', err);
          logout(false);
        });
      }, (expiresIn - 60) * 1000); // 1 minute before expiration
      
      return true;
      
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Clear any partial authentication state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
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
        } else if (error?.response?.data?.error) {
          setError(error.response.data.error);
        } else {
          setError('Ocurrió un error inesperado al iniciar sesión');
        }
      } else {
        setError('Error de autenticación');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
