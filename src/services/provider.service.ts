import { api } from "./api";
import type {
  CreateProviderDto,
  CreateProviderResponse,
  ProductLookupItem,
  ProviderLookupItem,
  ProviderRucLookupItem,
  ProviderDetail,
  ProviderFilters,
  ProviderListItem,
  ProviderListResponse,
  SaveProviderProductsResponse,
  UpdateProviderDto,
} from "@/types/provider.types";

class ProviderService {
  async getProviders(filters: ProviderFilters = {}): Promise<ProviderListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    if (filters.provider) params.set("provider", filters.provider);
    if (filters.ruc) params.set("ruc", filters.ruc);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);

    const query = params.toString();
    const url = query ? `/providers?${query}` : "/providers";
    const response = await api.get<ProviderListResponse>(url);
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

  async getProvidersLookup(): Promise<ProviderLookupItem[]> {
    const response = await api.get<ProviderLookupItem[]>("/providers/lookup");
    return response.data;
  }

  async getProvidersRucLookup(): Promise<ProviderRucLookupItem[]> {
    const response = await api.get<ProviderRucLookupItem[]>("/providers/lookup-ruc");
    return response.data;
  }
}

export const providerService = new ProviderService();
