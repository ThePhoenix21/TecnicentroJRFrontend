import { api, ApiError } from './api';

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: "ADMIN" | "USER";
  permissions?: string[]; // Permisos del usuario
  stores: Store[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  verified?: boolean;
  language?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  birthdate?: string | null;
  lastLoginIp?: string;
  avatarUrl?: string | null;
  passwordChangedAt?: string | null;
  passwordResetToken?: string | null;
  passwordResetTokenExpires?: string | null;
  verifyToken?: string;
  verifyTokenExpires?: string;
}

// DTO para crear usuarios regulares (solo USER) - requiere ADMIN
export interface CreateUserRegularDto {
  name: string;
  username?: string; // Opcional, se genera automáticamente si no se proporciona
  email: string;
  phone: string;
  password: string;
  storeId: string; // Obligatorio para USER
  permissions?: string[]; // Permisos para el usuario
}

// DTO para actualizar usuarios (excluye role y contraseña)
export interface UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  username?: string;
  language?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  avatarUrl?: string;
  verified?: boolean;
  birthdate?: string | null;
  storeId?: string; // Solo para USER y solo ADMIN puede modificarlo
  permissions?: string[]; // Permisos para el usuario
}

// DTO para cambio de rol
export interface ChangeRoleDto {
  email: string;
  password: string;
  newRole: "ADMIN" | "USER";
}

class UserService {
  private baseUrl = '/users';

  async getAllUsers(search?: string): Promise<User[]> {
    try {
      let url = this.baseUrl;
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      
      const response = await api.get<User[]>(url);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const response = await api.get<User>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Crear usuario regular (solo USER) - requiere ADMIN
  async createUser(userData: CreateUserRegularDto): Promise<User> {
    try {
      // Validar que storeId esté presente
      if (!userData.storeId) {
        throw new Error('Los usuarios tipo USER requieren una tienda asignada');
      }
      
      // El backend genera username automáticamente si no se proporciona
      const response = await api.post<User>('/users/create', userData);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Actualizar usuario
  async updateUser(id: string, userData: UpdateUserDto): Promise<User> {
    try {
      // Endpoint correcto para actualizar usuarios
      const response = await api.put<User>(`${this.baseUrl}/update/${id}`, userData);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Cambiar rol de usuario (solo ADMIN)
  async changeRole(changeRoleData: ChangeRoleDto): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    changedBy: {
      id: string;
      email: string;
      role: string;
    };
  }> {
    try {
      const response = await api.put('/users/change-role', changeRoleData);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Eliminar usuario (soft delete) - requiere ADMIN
  async deleteUser(id: string): Promise<User> {
    try {
      const response = await api.delete<User>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: unknown): void {
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as ApiError;
      if (apiError.response?.data?.message) {
        throw new Error(apiError.response.data.message);
      }
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error desconocido en la operación de usuarios');
  }
}

export const userService = new UserService();