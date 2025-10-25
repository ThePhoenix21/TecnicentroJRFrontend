export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  photoUrls: string[];
  status: string;
  type: string;
  isActive: boolean;
  order: {
    id: string;
    clientId: string;
    status: string;
    totalAmount: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  orderId: string;
  createdAt: string;
  updatedAt: string;
  client?: User; // Client information will be added here
}

export interface ServiceWithClient extends Service {
  client?: User;
}

export interface ServicesResponse {
  data: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateServiceDto {
  type: Service['type'];
  description: string;
  price: number;
  userId: string;
  status?: Service['status'];
}

export type UpdateServiceDto = Partial<{
  type: Service['type'];
  status: Service['status'];
  description: string;
  price: number;
  paid: boolean;
  userId: string;
}>;

export const SERVICE_TYPES = [
  { value: 'REPAIR', label: 'Reparación' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'INSTALLATION', label: 'Instalación' },
  { value: 'OTHER', label: 'Otro' },
];

export const SERVICE_STATUS = [
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];
