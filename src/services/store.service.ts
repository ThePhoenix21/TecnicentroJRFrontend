import { api, ApiError } from './api';
import { Store, CreateStoreDto, UpdateStoreDto, StoreResponse, StoreListResponse, StoreLookupItem } from '@/types/store';

class StoreService {
    private baseUrl = '/store';

    async getAllStores(): Promise<Store[]> {
        try {
            const response = await api.get<Store[]>(`${this.baseUrl}/tenant-info`);
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async createStore(storeData: CreateStoreDto): Promise<StoreResponse> {
        try {
            const response = await api.post<StoreResponse>(this.baseUrl, storeData);
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async updateStore(id: string, storeData: UpdateStoreDto): Promise<StoreResponse> {
        try {
            const response = await api.patch<StoreResponse>(`${this.baseUrl}/${id}`, storeData);
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async getStoreById(id: string): Promise<Store> {
        try {
            const response = await api.get<Store>(`${this.baseUrl}/${id}`);
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    async getStoresLookup(): Promise<StoreLookupItem[]> {
        try {
            const response = await api.get<StoreLookupItem[]>(`${this.baseUrl}/lookup`);
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    private handleError(error: unknown): void {
        if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as ApiError;
            if (apiError.response?.data?.message) {
                throw new Error(apiError.response.data.message);
            }
        }
        if (error instanceof Error) {
            throw error;
        }
            throw new Error('Error desconocido en la operación de tiendas');
    }
}

export const storeService = new StoreService();
