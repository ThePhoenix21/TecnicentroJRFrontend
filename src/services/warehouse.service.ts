import { domainApi } from "./domainApi";
import type {
  CreateWarehouseDto,
  CreateWarehouseResponse,
  DeleteWarehouseResponse,
  UpdateWarehouseDto,
  WarehouseDetail,
  WarehouseLookupItem,
  WarehouseListItem,
} from "@/types/warehouse.types";

/*
CONTRATO POR DOMINIO (WarehouseService)

- getWarehouses: STORE
- getWarehousesSimple: AMBOS (STORE/WAREHOUSE)
- getWarehousesLookup: AMBOS (STORE/WAREHOUSE)
- createWarehouse: STORE
- getWarehouseById: STORE
- updateWarehouse: STORE
- deleteWarehouse: STORE
- getStoresSimple: AMBOS (STORE/WAREHOUSE)
- updateWarehouseStores: STORE
*/

export type WarehouseSimpleItem = {
  id: string;
  name: string;
};

class WarehouseService {
  async getWarehouses(): Promise<WarehouseListItem[]> {
    const response = await domainApi.get<WarehouseListItem[]>({
      store: '/warehouses',
    });
    return response.data;
  }

  async getWarehousesSimple(): Promise<WarehouseSimpleItem[]> {
    const response = await domainApi.get<WarehouseSimpleItem[]>({
      store: '/warehouses/simple',
      warehouse: '/warehouses/simple',
    });
    return response.data;
  }

  async getWarehousesLookup(): Promise<WarehouseLookupItem[]> {
    const response = await domainApi.get<WarehouseLookupItem[]>({
      store: '/warehouses/lookup',
      warehouse: '/warehouses/lookup',
    });
    return response.data;
  }

  async createWarehouse(dto: CreateWarehouseDto): Promise<CreateWarehouseResponse> {
    const response = await domainApi.post<CreateWarehouseResponse>({
      store: '/warehouses',
    }, dto);
    return response.data;
  }

  async getWarehouseById(warehouseId: string): Promise<WarehouseDetail> {
    const response = await domainApi.get<WarehouseDetail>({
      store: `/warehouses/${warehouseId}`,
    });
    return response.data;
  }

  async updateWarehouse(warehouseId: string, dto: UpdateWarehouseDto): Promise<WarehouseDetail> {
    const response = await domainApi.put<WarehouseDetail>({
      store: `/warehouses/${warehouseId}`,
    }, dto);
    return response.data;
  }

  async getStoresSimple(): Promise<Array<{ id: string; name: string; address: string }>> {
    // Obtener tiendas del tenant actual
    const response = await domainApi.get<Array<{ id: string; name: string; address: string }>>({
      store: '/store/simple',
      warehouse: '/warehouses/simple',
    });
    return response.data;
  }

  async updateWarehouseStores(warehouseId: string, storeIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await domainApi.put<{ success: boolean; message: string }>(
      {
        store: `/warehouses/${warehouseId}/stores`,
      },
      { storeIds },
    );
    return response.data;
  }

  async deleteWarehouse(warehouseId: string): Promise<DeleteWarehouseResponse> {
    const response = await domainApi.delete<DeleteWarehouseResponse>({
      store: `/warehouses/${warehouseId}`,
    });
    return response.data;
  }
}

export const warehouseService = new WarehouseService();
