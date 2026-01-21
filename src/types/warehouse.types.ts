export type WarehouseListItem = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type WarehouseStore = {
  id: string;
  priority: number | null;
  createdAt: string;
  store: {
    id: string;
    name: string;
    address: string;
  };
};

export type WarehouseDetail = WarehouseListItem & {
  createdAt?: string;
  updatedAt?: string;
  warehouseStores?: WarehouseStore[];
};

export type CreateWarehouseDto = {
  name: string;
  address: string;
  phone: string;
};

export type UpdateWarehouseDto = {
  name: string;
  address: string;
  phone: string;
};

export type CreateWarehouseResponse = WarehouseDetail;

export type DeleteWarehouseResponse = {
  success: boolean;
};
