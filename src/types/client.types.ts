export type ClientListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  createdAt: string;
  salesCount?: number;
  cancelledCount?: number;
};

export type ClientsListResponse = {
  data: ClientListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type ClientFilters = {
  name?: string;
  phone?: string;
  dni?: string;
  fromDate?: string;
  toDate?: string;
};

export type ClientLookupNameItem = {
  id: string;
  name: string;
};

export type ClientLookupPhoneItem = {
  id: string;
  phone: string;
};

export type ClientLookupDniItem = {
  id: string;
  dni: string;
};

export type ClientCreatedBy = {
  name: string;
  role: string;
};

export type ClientOrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type ClientOrderPayment = {
  type: string;
  amount: number;
};

export type ClientOrderCashSession = {
  store: string;
  openedAt: string;
  closedAt: string;
};

export type ClientOrder = {
  orderNumber: string;
  status: string;
  total: number;
  date: string;
  items: ClientOrderItem[];
  payments: ClientOrderPayment[];
  cashSession: ClientOrderCashSession | null;
};

export type ClientFull = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dni: string | null;
  createdAt: string;
  createdBy: ClientCreatedBy | null;
  orders: ClientOrder[];
};
