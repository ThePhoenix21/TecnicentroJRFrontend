export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedById: string;
  closedById?: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: number;
  closingAmount: number;
  StoreId: string;
  UserId: string;
  Store?: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  User?: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  orderId?: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovementListItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  payment: string;
  description: string;
  clientName?: string;
  createdAt: string;
}

export interface CashMovementListResponse {
  data: CashMovementListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CashMovementLookupItem {
  id: string;
  value: string;
}

export interface CashBalance {
  sessionInfo: {
    id: string;
    openedAt: string;
    openingAmount: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
    store: {
      id: string;
      name: string;
    };
    status: 'OPEN' | 'CLOSED';
  };
  balance: {
    openingAmount: number;
    totalIngresos: number;
    totalSalidas: number;
    balanceActual: number;
  };
  movements: CashMovement[];
}

export interface OpenCashSessionRequest {
  storeId: string;
  openingAmount: number;
}

export interface CloseCashSessionResponse {
  message: string;
  cashSession: CashSession;
  cashBalance: {
    openingAmount: number;
    totalIngresos: number;
    totalSalidas: number;
    balanceActual: number;
  };
  movements: CashMovement[];
}

export interface ManualMovementRequest {
  cashSessionId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  payment: string;
  description: string;
}
