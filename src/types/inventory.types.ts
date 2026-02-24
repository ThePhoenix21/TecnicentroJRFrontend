export type InventoryMovementType = 'INCOMING' | 'OUTGOING' | 'ADJUST' | 'SALE' | 'RETURN';

export interface InventoryMovement {
  id: string;
  storeProductId?: string;
  storeProduct?: {
    id: string;
    product: {
      name: string;
      description?: string;
    };
    stock: number;
  };
  storeId?: string;
  store?: {
    name: string;
  };
  type: InventoryMovementType;
  quantity: number;
  previousStock?: number; // Si el backend lo devuelve
  newStock?: number;      // Si el backend lo devuelve
  description?: string;
  date?: string; // Corresponde al campo @default(now()) del backend
  createdAt?: string; // Mantenemos opcional por compatibilidad si se agrega luego
  createdById?: string; // El backend devuelve userId, pero mantenemos esto por si hay mapeo
  userId?: string;      // Agregamos userId directo del modelo
  createdBy?: {
    name: string;
    email: string;
  };
  user?: {              // Agregamos user directo del modelo
    name: string;
    email: string;
  };

  // Formato simplificado (historial): { date, name, userName }
  name?: string;
  userName?: string;
}

export interface CreateInventoryMovementDTO {
  storeProductId: string;
  type: InventoryMovementType;
  quantity: number;
  description?: string;
}

export interface InventoryMovementFilters {
  storeId?: string;
  storeProductId?: string;
  startDate?: string;
  endDate?: string;
}

export interface InventoryMovementsQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: InventoryMovementType;
  userId?: string;
  userName?: string;
  fromDate?: string;
  toDate?: string;
  storeId?: string;
}

export interface InventoryMovementsListResponse {
  data: InventoryMovement[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductLookupItem {
  id: string;
  name: string;
}

export interface UserLookupItem {
  id: string;
  name: string;
}

export interface InventoryStats {
  period: {
    start: string;
    end: string;
  };
  stats: {
    incoming: number;
    outgoing: number;
    sales: number;
    adjustments: number;
  };
  criticalProducts: Array<{
    id: string;
    name: string;
    store: string;
    stock: number;
    threshold: number;
    status: 'NORMAL' | 'LOW' | 'CRITICAL';
  }>;
}

export interface InventorySummaryPeriod {
  from: string;
  to: string;
}

export interface InventorySummaryTotals {
  incoming: number;
  outgoing: number;
  sales: number;
  adjustmentsNet: number;
}

export interface InventorySummaryResponse {
  period: InventorySummaryPeriod;
  storeId: string;
  totals: InventorySummaryTotals;
}

// Interfaces para Inventario Físico
export interface InventoryCountSession {
  id: string;
  name: string;
  storeId: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  finalizedAt?: string;
  items?: InventoryCountItem[];
}

export interface InventoryCountItem {
  id: string;
  sessionId: string;
  storeProductId: string;
  storeProduct?: {
    product: {
      name: string;
    };
    stock: number; // Stock teórico al momento del cierre o creación
  };
  expectedStock: number;
  physicalStock: number;
  difference: number;
  updatedAt: string;
}

export interface CreateInventoryCountSessionDTO {
  name: string;
  storeId: string;
}

export interface InventorySessionReport {
  session: {
    id: string;
    name: string;
    createdAt: string;
    finalizedAt?: string;
    store: {
      id: string;
      name: string;
    };
    createdBy: {
      id: string;
      name: string;
    };
  };
  summary: {
    totalProducts: number;
    countedProducts: number;
    correctCount: number;
    discrepancies: number;
    positiveDiscrepancies: number;
    negativeDiscrepancies: number;
  };
  items: Array<{
    storeProduct: {
      id: string;
      product: {
        name: string;
        description?: string;
      };
    };
    expectedStock: number;
    physicalStock: number;
    difference: number;
  }>;
}
