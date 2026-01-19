export type EmployedStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

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

export interface StoreAssignment extends EmployedAssignmentBase {
  storeId?: string;
  storeName?: string;
  store?: {
    id: string;
    name: string;
  };
}

export interface WarehouseAssignment extends EmployedAssignmentBase {
  warehouseId?: string;
  warehouseName?: string;
  warehouse?: {
    id: string;
    name: string;
  };
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
  storeAssignments?: StoreAssignment[];
  warehouseAssignments?: WarehouseAssignment[];
}

export interface UpdateEmployedDto {
  firstName?: string;
  phone?: string;
  email?: string;
  position?: string;
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
