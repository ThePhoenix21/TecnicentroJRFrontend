export type EmployedStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type EmployedPositionLookupItem = string;

export type EmployedStatusLookupItem = EmployedStatus;

export type EmployedNameLookupItem = {
  id: string;
  firstName: string;
  lastName: string;
};

export type EmployedFilters = {
  status?: EmployedStatus;
  firstName?: string;
  lastName?: string;
  position?: string;
  storeId?: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
};

export interface EmployedListItem {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  status: EmployedStatus;
  assignmentName?: string | null;
  assignmentType?: 'STORE' | 'WAREHOUSE' | null;
  storeName?: string | null;
  warehouseName?: string | null;
}

export interface EmployedAssignmentBase {
  id: string;
  assignmentRole?: string;
}

export interface StoreAssignment {
  id: string;
  employedId: string;
  storeId: string;
  role: string;
  assignedAt: string;
  store: {
    id: string;
    name: string;
    address: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    tenantId: string;
  };
}

export interface WarehouseAssignment {
  id: string;
  employedId: string;
  warehouseId: string;
  role: string;
  assignedAt: string;
  warehouse: {
    id: string;
    name: string;
    address: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    tenantId: string;
  };
}

export interface EmployedHistory {
  id: string;
  employedId: string;
  hiredAt: string;
  endedAt: string | null;
  reason: string;
  updatedByUserId: string | null;
  createdById: string;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    name: string;
  };
  updatedByUser: null;
}

export interface CreatedByUser {
  id: string;
  email: string;
  name: string;
}

export interface EmployedDetail {
  id: string;
  firstName: string;
  lastName: string;
  document: string;
  phone?: string | null;
  email?: string | null;
  position: string;
  status: EmployedStatus;
  documentUrls: string[];
  deletedAt: string | null;
  userId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  user: null; // según ejemplo, siempre null
  createdByUser: CreatedByUser;
  storeAssignments: StoreAssignment[];
  warehouseAssignments: WarehouseAssignment[];
  employedHistories: EmployedHistory[];
}

export interface UpdateEmployedDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  position?: string;
  status?: string;
}

export interface CreateEmployedDto {
  firstName: string;
  lastName: string;
  document: string;
  phone?: string;
  email?: string;
  position: string;
  storeId?: string;
  warehouseId?: string;
  assignmentRole: string;
}

export interface RecreateEmployedDto {
  firstName: string;
  lastName: string;
  document: string;
  phone?: string;
  email?: string;
  position: string;
  storeId?: string;
  warehouseId?: string;
  assignmentRole: string;
}
