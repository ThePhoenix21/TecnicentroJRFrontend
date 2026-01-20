import { api } from "./api";
import type {
  CreateWarehouseDto,
  CreateWarehouseResponse,
  DeleteWarehouseResponse,
  UpdateWarehouseDto,
  WarehouseDetail,
  WarehouseListItem,
} from "@/types/warehouse.types";

class WarehouseService {
  async getWarehouses(): Promise<WarehouseListItem[]> {
    const response = await api.get<WarehouseListItem[]>("/warehouses");
    return response.data;
  }

  async createWarehouse(dto: CreateWarehouseDto): Promise<CreateWarehouseResponse> {
    const response = await api.post<CreateWarehouseResponse>("/warehouses", dto);
    return response.data;
  }

  async getWarehouseById(warehouseId: string): Promise<WarehouseDetail> {
    const response = await api.get<WarehouseDetail>(`/warehouses/${warehouseId}`);
    return response.data;
  }

  async updateWarehouse(warehouseId: string, dto: UpdateWarehouseDto): Promise<WarehouseDetail> {
    const response = await api.put<WarehouseDetail>(`/warehouses/${warehouseId}`, dto);
    return response.data;
  }

  async deleteWarehouse(warehouseId: string): Promise<DeleteWarehouseResponse> {
    const response = await api.delete<DeleteWarehouseResponse>(`/warehouses/${warehouseId}`);
    return response.data;
  }
}

export const warehouseService = new WarehouseService();
