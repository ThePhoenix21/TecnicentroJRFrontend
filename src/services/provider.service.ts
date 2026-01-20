import { api } from "./api";
import type {
  CreateProviderDto,
  CreateProviderResponse,
  ProductLookupItem,
  ProviderDetail,
  ProviderListItem,
  SaveProviderProductsResponse,
  UpdateProviderDto,
} from "@/types/provider.types";

class ProviderService {
  async getProviders(): Promise<ProviderListItem[]> {
    const response = await api.get<ProviderListItem[]>("/providers");
    return response.data;
  }

  async createProvider(dto: CreateProviderDto): Promise<CreateProviderResponse> {
    const response = await api.post<CreateProviderResponse>("/providers", dto);
    return response.data;
  }

  async getProviderById(providerId: string): Promise<ProviderDetail> {
    const response = await api.get<ProviderDetail>(`/providers/${providerId}`);
    return response.data;
  }

  async updateProvider(providerId: string, dto: UpdateProviderDto): Promise<ProviderDetail> {
    const response = await api.patch<ProviderDetail>(`/providers/${providerId}`, dto);
    return response.data;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await api.delete(`/providers/${providerId}`);
  }

  async saveProviderProducts(providerId: string, productIds: string[]): Promise<SaveProviderProductsResponse> {
    const response = await api.post<SaveProviderProductsResponse>(`/providers/${providerId}/products`, {
      productIds,
    });
    return response.data;
  }

  async getProductsLookup(): Promise<ProductLookupItem[]> {
    const response = await api.get<ProductLookupItem[]>("/catalog/products/lookup");
    return response.data;
  }
}

export const providerService = new ProviderService();
