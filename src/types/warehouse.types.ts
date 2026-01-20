export type WarehouseListItem = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type WarehouseDetail = WarehouseListItem & {
  createdAt?: string;
  updatedAt?: string;
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
