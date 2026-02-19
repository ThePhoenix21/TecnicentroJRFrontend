// src/services/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Variable global para manejar errores de conexión
let connectionErrorHandler: ((hasError: boolean) => void) | null = null;

export const setConnectionErrorHandler = (handler: (hasError: boolean) => void) => {
  connectionErrorHandler = handler;
};

// Frontend se ejecuta en el puerto 3001, Backend API se ejecuta en el puerto 3000
export const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

// Crear instancia de axios con configuración por defecto
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 segundos de tiempo de espera
});

// Registrar la URL base para depuración
console.log('API Base URL:', getApiBaseUrl());

// Interceptor de solicitud para agregar token de autenticación
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      } else if (config.headers) {
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _skipAuthRedirect?: boolean };
    
    if (error.code === 'ECONNABORTED' || !error.response) {
      // Error de timeout o de red - activar pantalla de error de conexión
      console.error('Error de conexión o timeout del servidor');
      
      if (connectionErrorHandler) {
        connectionErrorHandler(true);
      }
    } else if (error.response.status === 401) {
      // Manejar acceso no autorizado
      if (typeof window !== 'undefined' && !originalRequest?._retry && !originalRequest?._skipAuthRedirect) {
        if (originalRequest) {
          originalRequest._retry = true;
        }
        // Limpiar datos de autenticación y redirigir al login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };

export interface ApiError extends Error {
  response?: {
    data: {
      message?: string;
      error?: string;
      statusCode?: number;
    };
    status: number;
  };
}