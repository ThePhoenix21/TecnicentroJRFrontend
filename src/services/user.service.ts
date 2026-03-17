import { api, ApiError } from './api';
import { Warehouse, Store, CreateUserFromEmployedRequest, CreateUserRequest, UpdateUserRequest, UserResponse } from '@/types/user.types';

export interface UserLookupItem {
  id: string;
  name: string;
}

// DTO para crear usuarios regulares (solo USER) - requiere ADMIN
export interface CreateUserRegularDto {
  name: string;
  username?: string; // Opcional, se genera automáticamente si no se proporciona
  email: string;
  phone: string;
  password: string;
  storeId?: string;        // XOR con warehouseId
  warehouseId?: string;    // XOR con storeId
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
  storeId?: string;        // XOR con warehouseId
  warehouseId?: string;    // XOR con storeId
  permissions?: string[]; // Permisos para el usuario
}

// DTO para cambio de rol
export interface ChangeRoleDto {
  email: string;
  password: string;
  newRole: "ADMIN" | "USER";
}

// DTO para crear usuario desde empleado
export interface CreateUserFromEmployedDto {
  employedId: string;
  role: "ADMIN" | "USER";
  password: string;
  permissions?: string[];
}

class UserService {
  private baseUrl = '/users';

  async getUsersLookup(): Promise<UserLookupItem[]> {
    try {
      const response = await api.get<UserLookupItem[]>(`${this.baseUrl}/lookup`);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getAllUsers(search?: string): Promise<UserResponse[]> {
    try {
      let url = this.baseUrl;
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      
      const response = await api.get<UserResponse[]>(url);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserResponse> {
    try {
      const response = await api.get<UserResponse>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async createUserFromEmployed(
    data: CreateUserFromEmployedDto,
    storeId?: string,
    warehouseId?: string
  ): Promise<UserResponse> {
    try {
      // Validar que se proporcione storeId O warehouseId (XOR)
      if (!storeId && !warehouseId) {
        throw new Error('Debe proporcionar una tienda o almacén');
      }
      if (storeId && warehouseId) {
        throw new Error('No puede proporcionar tanto tienda como almacén');
      }

      // Construir URL con storeId o warehouseId en params
      const endpoint = storeId
        ? `${this.baseUrl}/from-employed/store/${storeId}`
        : `${this.baseUrl}/from-employed/warehouse/${warehouseId}`;

      const response = await api.post<UserResponse>(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Crear usuario regular (solo USER) - requiere ADMIN
  async createUser(userData: CreateUserRegularDto): Promise<UserResponse> {
    try {
      // Validar XOR: Debe proporcionar storeId O warehouseId, pero NO ambos
      if (!userData.storeId && !userData.warehouseId) {
        throw new Error('Debe seleccionar una tienda o almacén');
      }
      if (userData.storeId && userData.warehouseId) {
        throw new Error('No puede seleccionar tanto tienda como almacén');
      }

      // El backend genera username automáticamente si no se proporciona
      const response = await api.post<UserResponse>('/users/create', userData);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Actualizar usuario
  async updateUser(id: string, userData: UpdateUserDto): Promise<UserResponse> {
    try {
      // Endpoint correcto para actualizar usuarios
      const response = await api.put<UserResponse>(`${this.baseUrl}/update/${id}`, userData);
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
  // deleteEmployed:
  // - undefined: solo elimina usuario
  // - false: elimina usuario y suspende empleado
  // - true: elimina usuario y marca empleado como inactivo + deletedAt
  async deleteUser(id: string, deleteEmployed?: boolean): Promise<UserResponse> {
    try {
      const query = typeof deleteEmployed === 'boolean' ? `?deleteEmployed=${deleteEmployed}` : '';
      const response = await api.delete<UserResponse>(`${this.baseUrl}/${id}${query}`);
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