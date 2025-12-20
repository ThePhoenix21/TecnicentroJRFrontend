// src/types/sale.types.ts

export interface ProductOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
}

export interface ProductOrder {
  productId: string;
  quantity: number;
  unitPrice?: number;  
  price?: number;
  customPrice?: number;
  name?: string;       
  // ... other properties
}

export interface ServiceOrderItem {
  name: string;
  price: number;
  description?: string;
  type: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS'; // Updated to match backend specification
  photoUrls?: string[];
}

export interface ClientInfo {
  name?: string;
  email?: string;  // Made optional to match backend
  phone?: string;  // Made optional to match backend
  address?: string;
  dni: string;
  ruc?: string;  // Added to match backend specification
  notes?: string;
}

export interface CreateOrderItem {
  product: {
    id: string;
  };
  quantity: number;
  unitPrice: number;
  name?: string;
}

export interface CreateOrderDto {
  items: CreateOrderItem[];
  paymentMethod: string;
  total: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  clientInfo?: ClientInfo;
}

export interface SaleData {
  // New structure matching backend specification
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    dni?: string;  // Changed from 'string' to 'string | undefined' to match component usage
    ruc?: string;
  };
  paymentMethods?: Array<{
    type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
    amount: number;
  }>;
  products?: Array<{
    productId: string;
    quantity: number;
    price?: number;
    customPrice?: number;
    payments?: Array<{
      type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
      amount: number;
    }>;
  }>;
  services?: Array<{
    name: string;
    description?: string;
    price: number;
    type: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS'; // Updated to match backend
    photoUrls?: string[];
    payments?: Array<{
      type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
      amount: number;
    }>;
  }>;
  cashSessionId: string; // OBLIGATORIO según nuevo servicio
  status?: string;
  paymentMethod?: string;
  total?: number;

  // Old structure (for backward compatibility)
  items?: CreateOrderItem[];
  customer?: {
    name?: string;
    phone?: string;
    dni?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
  customerName?: string;
  customerPhone?: string;
  customerDni?: string;
}

// Type guard to check if the data is in the new format
export const isNewSaleData = (data: SaleData): data is Required<Pick<SaleData, 'products' | 'services' | 'cashSessionId'>> & {
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    dni: string;
    ruc?: string;
  };
  paymentMethod?: string;
  total?: number;
  status?: string;
} => {
  return 'products' in data && 'services' in data && 'cashSessionId' in data;
};

// Tipos para respuestas de órdenes/ventas
export interface Payment {
  id: string;
  type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
  amount: number;
  sourceType: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'PAID' | 'ANNULLATED' | 'CANCELLED';

export interface ServiceOrder {
  id: string;
  type: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';
  status: ServiceStatus;
  name: string;
  description: string | null;
  photoUrls: string[];
  price: number;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  payments: Payment[];
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface CashSessionInfo {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedById: string;
  closedById: string | null;
  status: string;
  openingAmount: number;
  closingAmount: number | null;
  StoreId: string;
  UserId: string;
  Store: StoreInfo;
}

export interface PdfInfo {
  businessName: string;
  address: string;
  phone: string;
  currentDate: string;
  currentTime: string;
  orderNumber: string;
  sellerName: string;
  clientName: string;
  clientDni: string;
  clientPhone: string;
  paidAmount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  isPriceModified: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  clientId: string;
  cashSessionsId: string;
  canceledAt: string | null;
  canceledById: string | null;
  orderProducts: any[]; // Puedes tipar esto más específicamente si es necesario
  services: ServiceOrder[];
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    ruc: string | null;
    dni: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
  };
  user: UserInfo;
  cashSession: CashSessionInfo;
  pdfInfo: PdfInfo;
}

export interface OrdersResponse {
  data: Order[];
  total: number;
  meta?: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}