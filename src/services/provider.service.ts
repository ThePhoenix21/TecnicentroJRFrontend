import { domainApi } from "./domainApi";
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
    const response = await domainApi.get<ProviderListResponse>({
      store: query ? `/providers?${query}` : "/providers",
      warehouse: query ? `/warehouse/suppliers?${query}` : '/warehouse/suppliers',
    });
    return response.data;
  }

  async createProvider(dto: CreateProviderDto): Promise<CreateProviderResponse> {
    const response = await domainApi.post<CreateProviderResponse>({
      store: '/providers',
      warehouse: '/warehouse/suppliers',
    }, dto);
    return response.data;
  }

  async getProviderById(providerId: string): Promise<ProviderDetail> {
    const response = await domainApi.get<ProviderDetail>({
      store: `/providers/${providerId}`,
      warehouse: `/warehouse/suppliers/${providerId}`,
    });
    return response.data;
  }

  async updateProvider(providerId: string, dto: UpdateProviderDto): Promise<ProviderDetail> {
    const response = await domainApi.patch<ProviderDetail>({
      store: `/providers/${providerId}`,
      warehouse: `/warehouse/suppliers/${providerId}`,
    }, dto);
    return response.data;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await domainApi.delete({
      store: `/providers/${providerId}`,
      warehouse: `/warehouse/suppliers/${providerId}`,
    });
  }

  async saveProviderProducts(providerId: string, productIds: string[]): Promise<SaveProviderProductsResponse> {
    const response = await domainApi.post<SaveProviderProductsResponse>({
      store: `/providers/${providerId}/products`,
      warehouse: `/warehouse/suppliers/${providerId}/products`,
    }, {
      productIds,
    });
    return response.data;
  }

  async getProductsLookup(search?: string): Promise<ProductLookupItem[]> {
    const params = search ? { search } : undefined;
    const response = await api.get<ProductLookupItem[]>('/catalog/products/lookup-sku', { params });
    return response.data;
  }

  async getProvidersLookup(): Promise<ProviderLookupItem[]> {
    const response = await api.get<ProviderLookupItem[]>('/providers/lookup');
    return response.data;
  }

  async getProvidersRucLookup(): Promise<ProviderRucLookupItem[]> {
    const response = await api.get<ProviderRucLookupItem[]>('/providers/lookup-ruc');
    return response.data;
  }

  async getProviderProducts(providerId: string): Promise<ProductLookupItem[]> {
    const response = await api.get<{ products: ProductLookupItem[] }>(`/providers/${providerId}/products`);
    return response.data.products;
  }
}

export const providerService = new ProviderService();
