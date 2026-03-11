// Tipos para usuarios con asignación a tiendas O almacenes (XOR)
export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

// Interfaces de requests actualizadas
export interface CreateUserFromEmployedRequest {
  employedId: string;
  role: 'ADMIN' | 'USER';
  storeId?: string;        // XOR con warehouseId
  warehouseId?: string;    // XOR con storeId
  password: string;
  permissions?: string[];
}

export interface CreateUserRequest {
  name: string;
  email?: string;
  password: string;
  storeId?: string;        // XOR con warehouseId
  warehouseId?: string;    // XOR con storeId
  permissions?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  storeId?: string;        // XOR con warehouseId
  warehouseId?: string;    // XOR con storeId
}

// Interfaces de responses actualizadas
export interface UserResponse {
  id: string;
  name: string;
  username?: string; // ✅ Agregado
  email: string;
  phone?: string; // ✅ Agregado
  role: string;
  stores: Store[];         // ✅ NUEVO: Array de tiendas asignadas
  warehouses: Warehouse[]; // ✅ NUEVO: Array de almacenes asignados
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  verified?: boolean;
  language?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  birthdate?: string | null;
  avatarUrl?: string | null;
}

// Tipo para el selector de asignación
export type AssignmentType = 'store' | 'warehouse';

// Formulario de usuario con selector de tipo
export interface UserFormData {
  name: string;
  email?: string;
  password: string;
  assignmentType: AssignmentType; // ✅ NUEVO: Selector de tipo
  storeId?: string;
  warehouseId?: string;
  permissions?: string[];
}
