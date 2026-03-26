import { api } from "./api";
import type {
  CreateProductPackDto,
  ProductPack,
  ProductPackListResponse,
  ProductPackLookupItem,
  ProductPackPreview,
  UpdateProductPackDto,
} from "@/types/product-pack.types";

const normalizeListResponse = (payload: any): ProductPackListResponse => {
  if (Array.isArray(payload)) {
    return {
      data: payload.map(normalizePackListItem),
      total: payload.length,
      totalPages: 1,
      page: 1,
      pageSize: payload.length,
    };
  }

  return {
    data: Array.isArray(payload?.data) ? payload.data.map(normalizePackListItem) : [],
    total: Number(payload?.total ?? payload?.meta?.totalItems ?? 0),
    totalPages: Number(payload?.totalPages ?? payload?.meta?.totalPages ?? 1),
    page: Number(payload?.page ?? payload?.meta?.currentPage ?? 1),
    pageSize: Number(payload?.pageSize ?? payload?.meta?.itemsPerPage ?? 10),
  };
};

const normalizePackItem = (item: any) => ({
  id: item?.id,
  productId: item?.productId ?? item?.product?.id ?? "",
  quantity: Number(item?.quantity ?? item?.cantidad ?? 0),
  product: item?.product
    ? {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        description: item.product.description,
      }
    : undefined,
});

const normalizePackListItem = (item: any) => ({
  id: item?.id,
  name: item?.name ?? item?.nombre ?? "",
  description: item?.description ?? item?.descripcion ?? "",
  fixedPrice: Number(item?.fixedPrice ?? item?.precioFijo ?? 0),
  isActive: Boolean(item?.isActive ?? item?.activo ?? false),
  itemsCount: Number(item?.itemsCount ?? item?.cantidadComponentes ?? item?.items?.length ?? 0),
  items: Array.isArray(item?.items) ? item.items.map(normalizePackItem) : undefined,
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const normalizePack = (item: any): ProductPack => ({
  id: item?.id,
  name: item?.name ?? item?.nombre ?? "",
  description: item?.description ?? item?.descripcion ?? "",
  fixedPrice: Number(item?.fixedPrice ?? item?.precioFijo ?? 0),
  isActive: Boolean(item?.isActive ?? item?.activo ?? false),
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
  items: Array.isArray(item?.items) ? item.items.map(normalizePackItem) : [],
});

const normalizePreview = (preview: any): ProductPackPreview => ({
  packId: preview?.packId ?? preview?.id ?? "",
  storeId: preview?.storeId ?? "",
  hasStockIssues: Boolean(preview?.hasStockIssues ?? preview?.hasIssues ?? false),
  items: Array.isArray(preview?.items)
    ? preview.items.map((item: any) => ({
        productId: item?.productId ?? item?.product?.id ?? "",
        productName: item?.productName ?? item?.product?.name ?? item?.name ?? "Producto",
        quantity: Number(item?.quantity ?? item?.cantidad ?? 0),
        storeProductId: item?.storeProductId ?? null,
        stock: item?.stock ?? item?.currentStock ?? null,
        requiredStock: item?.requiredStock ?? item?.required ?? null,
        remainingStock: item?.remainingStock ?? item?.remaining ?? null,
        hasStockIssue: Boolean(
          (item?.hasStockIssue ??
            item?.insufficientStock ??
            item?.stock === 0) ||
            Number(item?.stock ?? 0) < 0 ||
            (item?.requiredStock !== undefined && Number(item?.stock ?? 0) < Number(item?.requiredStock ?? 0))
        ),
      }))
    : [],
});

export const productPackService = {
  async list(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<ProductPackListResponse> {
    const response = await api.get("/product-packs", { params });
    return normalizeListResponse(response.data);
  },

  async lookup(search?: string): Promise<ProductPackLookupItem[]> {
    const response = await api.get<ProductPackLookupItem[]>("/product-packs/lookup", {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getById(id: string): Promise<ProductPack> {
    const response = await api.get(`/product-packs/${id}`);
    return normalizePack(response.data);
  },

  async getPreview(packId: string, storeId: string): Promise<ProductPackPreview> {
    const response = await api.get(`/product-packs/${packId}/preview/${storeId}`);
    return normalizePreview(response.data);
  },

  async create(payload: CreateProductPackDto): Promise<ProductPack> {
    const response = await api.post("/product-packs/create", payload);
    return normalizePack(response.data);
  },

  async update(id: string, payload: UpdateProductPackDto): Promise<ProductPack> {
    const response = await api.patch(`/product-packs/update/${id}`, payload);
    return normalizePack(response.data);
  },

  async toggleActive(id: string, value: boolean): Promise<ProductPack> {
    const response = await api.patch(`/product-packs/${id}/active`, null, {
      params: { value },
    });
    return normalizePack(response.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/product-packs/${id}`);
  },
};
