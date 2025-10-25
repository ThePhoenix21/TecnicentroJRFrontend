// src/services/api.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.code === 'ECONNABORTED') {
      console.error('Tiempo de espera agotado. Por favor verifica tu conexión a internet.');
    } else if (!error.response) {
      // Error de red o problema de CORS
      console.error('Error de red. Esto podría deberse a uno de los siguientes motivos:');
      console.error('1. El servidor no se está ejecutando o no es accesible');
      console.error('2. CORS no está configurado correctamente en el servidor');
      console.error('3. Estás desconectado');
      
      console.error('Detalles del error:', {
        message: error.message,
        code: error.code,
        config: {
          url: originalRequest?.url,
          method: originalRequest?.method,
          baseURL: originalRequest?.baseURL,
          withCredentials: originalRequest?.withCredentials,
        },
      });
    } else if (error.response.status === 401) {
      // Manejar acceso no autorizado
      if (typeof window !== 'undefined' && !originalRequest?._retry) {
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