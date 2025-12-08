// src/services/admin-register.ts
import { api } from '@/services/api';

export interface CreateAdminData {
  email: string;
  password: string;
  name: string;
  username?: string;
  phone: string;
  birthdate?: string;
  language?: string;
  timezone?: string;
  permissions?: string[];
}

export interface CreateAdminResponse {
  id: string;
  email: string;
  name: string;
  username: string;
  phone: string;
  verified: boolean;
  createdAt: string;
  stores: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
    createdById: string | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }[];
}

class AdminRegisterService {
  async createAdmin(adminData: CreateAdminData): Promise<CreateAdminResponse> {
    try {
      console.log('🔐 Creando administrador:', { email: adminData.email, name: adminData.name });
      
      const response = await api.post<CreateAdminResponse>('/auth/register', adminData);
      
      console.log('✅ Administrador creado exitosamente:', {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        storesCount: response.data.stores.length
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear administrador:', error);
      
      // Manejo mejorado de errores
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: {
            status?: number;
            data?: {
              message?: string;
              error?: string;
              code?: string;
            };
          };
        };
        
        if (apiError.response?.data?.message) {
          throw new Error(apiError.response.data.message);
        }
      }
      
      throw error;
    }
  }
}

export const adminRegisterService = new AdminRegisterService();
