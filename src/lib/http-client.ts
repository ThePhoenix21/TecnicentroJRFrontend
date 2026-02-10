import { toast } from 'sonner';

interface ApiError {
  status?: number;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setAuthHeader(headers: Record<string, string>): Record<string, string> {
    const token = this.getAuthToken();
    if (token) {
      return {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      // Manejar errores específicos
      if (response.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }

      if (response.status === 403) {
        // Sin permisos
        const message = data?.message || data?.error || 'No tienes permisos para realizar esta acción';
        toast.error(message);
        throw new Error(message);
      }

      // Otros errores
      const message = data?.message || data?.error || `Error ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    return data;
  }

  private handleError(error: any): never {
    console.error('HTTP Client Error:', error);

    // Error de red o conexión
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      const message = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      toast.error(message);
      throw new Error(message);
    }

    // Error ya manejado por handleResponse
    if (error.message.includes('Sesión expirada') || error.message.includes('permisos')) {
      throw error;
    }

    // Error genérico
    const message = error?.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
    toast.error(message);
    throw new Error(message);
  }

  async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.setAuthHeader({
          ...this.defaultHeaders,
          ...headers,
        }),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.setAuthHeader({
          ...this.defaultHeaders,
          ...headers,
        }),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.setAuthHeader({
          ...this.defaultHeaders,
          ...headers,
        }),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async patch<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.setAuthHeader({
          ...this.defaultHeaders,
          ...headers,
        }),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.setAuthHeader({
          ...this.defaultHeaders,
          ...headers,
        }),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Instancia global del cliente HTTP
export const httpClient = new HttpClient();
