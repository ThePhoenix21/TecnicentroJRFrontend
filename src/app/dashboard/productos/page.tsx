'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { storeProductService } from '@/services/store-product.service';
import { domainApi } from '@/services/domainApi';
import { productService } from '@/services/product.service';
import { inventoryService } from '@/services/inventory.service';
import { storeService } from '@/services/store.service';
import {
  StoreProduct,
  CreateStoreProductRequest,
  StoreProductListItem,
  StoreProductDetail,
  WarehouseProduct,
  WarehouseProductsListResponse,
} from '@/types/store-product.types';
import { StoreLookupItem } from '@/types/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActiveFilters } from '@/components/ui/active-filters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Search, X, Info, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { ProductHistory } from '@/components/inventory/ProductHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRScanner } from '@/components/ui/qr-scanner';
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StoreProductFormData {
  name: string;
  description: string;
  sku: string;
  buyCost: number;
  basePrice: number;
  price: number;
  stock: number;
  stockThreshold: number;
}

export default function ProductsPage() {
  const [storeProducts, setStoreProducts] = useState<StoreProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [storesLookup, setStoresLookup] = useState<StoreLookupItem[]>([]);

  const [nameFilter, setNameFilter] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [nameLookupLoading, setNameLookupLoading] = useState(false);
  const nameInputWrapperRef = useRef<HTMLDivElement | null>(null);

  const [skuFilter, setSkuFilter] = useState('');
  const [skuQuery, setSkuQuery] = useState('');
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [skuSuggestions, setSkuSuggestions] = useState<Array<{ id: string; sku: string }>>([]);
  const [skuLookupLoading, setSkuLookupLoading] = useState(false);
  const skuInputWrapperRef = useRef<HTMLDivElement | null>(null);
  const filteredNameSuggestions = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    if (!query) return [];
    return nameSuggestions.filter((item) => item.name?.toLowerCase().includes(query));
  }, [nameQuery, nameSuggestions]);

  const filteredSkuSuggestions = useMemo(() => {
    const query = skuQuery.trim().toLowerCase();
    if (!query) return [];
    return skuSuggestions.filter((item) => item.sku?.toLowerCase().includes(query));
  }, [skuQuery, skuSuggestions]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStoreProduct, setCurrentStoreProduct] = useState<StoreProduct | null>(null);
  const [originalStock, setOriginalStock] = useState<number | null>(null); // Nuevo estado
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<StoreProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [skuNotFoundModalOpen, setSkuNotFoundModalOpen] = useState(false);
  const [skuNotFoundCode, setSkuNotFoundCode] = useState('');
  const [skuNotFoundRemember, setSkuNotFoundRemember] = useState(false);
  const [skuReplaceModalOpen, setSkuReplaceModalOpen] = useState(false);
  const [skuReplaceCode, setSkuReplaceCode] = useState('');
  const [skuReplaceRemember, setSkuReplaceRemember] = useState(false);

  const [detailForm, setDetailForm] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    buyCost: '',
    basePrice: '',
    stockThreshold: '',
  });
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false);
  const [isDeletingStoreProduct, setIsDeletingStoreProduct] = useState(false);
  const [isDeletingCatalogProduct, setIsDeletingCatalogProduct] = useState(false);
  const [catalogDeleteCredentials, setCatalogDeleteCredentials] = useState({ email: '', password: '' });
  const [showCatalogDeleteForm, setShowCatalogDeleteForm] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<StoreProductFormData>({
    name: '',
    description: '',
    sku: '',
    buyCost: 0,
    basePrice: 0,
    price: 0,
    stock: 0,
    stockThreshold: 1,
  });

  const filtersInitializedRef = useRef(false);

  // Inicializar hooks
  const router = useRouter();
  const { toast } = useToast();
  const { user, currentStore, currentWarehouse, activeLoginMode, isAuthenticated, isAdmin, hasPermission } = useAuth();

  const isWarehouseMode = activeLoginMode === 'WAREHOUSE';

  const { can } = usePermissions();

  const canViewProducts = can(PERMISSIONS.VIEW_PRODUCTS);
  const canViewProductPrices = can(PERMISSIONS.VIEW_PRODUCT_PRICES);
  const canViewProductCost = can(PERMISSIONS.VIEW_PRODUCT_COST);
  const canManageProducts = can(PERMISSIONS.MANAGE_PRODUCTS);
  const canManagePrices = can(PERMISSIONS.MANAGE_PRICES);
  const canDeleteProducts = can(PERMISSIONS.DELETE_PRODUCTS);

  const canManageWarehouseProducts = isAdmin || hasPermission?.('MANAGE_WAREHOUSE_PRODUCTS');

  const canManagePricesEffective = isAdmin || canManagePrices;
  const canViewProductCostEffective = isAdmin || canViewProductCost;

  const canCreateProducts = canViewProducts && canManageProducts;

  const canManageInventory = isAdmin || hasPermission?.("MANAGE_INVENTORY") || hasPermission?.("inventory.manage");

  const canCreateWarehouseProducts = isAdmin || canManageProducts || canManageInventory || canManageWarehouseProducts || canViewProducts;

  const isForbiddenError = (error: unknown) => {
    const anyError = error as any;
    return anyError?.response?.status === 403;
  };

  const isUnauthorizedError = (error: unknown) => {
    const anyError = error as any;
    return anyError?.response?.status === 401;
  };

  useEffect(() => {
    if (isWarehouseMode) return;
    if (currentStore?.id && !selectedStoreId) {
      setSelectedStoreId(currentStore.id);
      setStoreQuery(currentStore.name);
    }
  }, [currentStore?.id, currentStore?.name, selectedStoreId, isWarehouseMode]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isWarehouseMode) return;

    const loadStores = async () => {
      try {
        const stores = await storeService.getStoresLookup();
        setStoresLookup(Array.isArray(stores) ? stores : []);
      } catch (error) {
        if (isUnauthorizedError(error)) return;
        console.error('Error loading stores lookup:', error);
      }
    };

    loadStores();
  }, [isAuthenticated, isWarehouseMode]);

  const fetchStoreProducts = useCallback(async (targetPage = 1) => {
    if (!isAuthenticated) return;

    if (isWarehouseMode) {
      if (!canViewProducts) {
        setStoreProducts([]);
        return;
      }

      try {
        setLoading(true);
        const response = await domainApi.get<WarehouseProductsListResponse>('/warehouse/products', {
          params: {
            page: targetPage,
            pageSize: PAGE_SIZE,
            name: nameFilter.trim() || undefined,
            inStock: hideOutOfStock ? true : undefined,
          },
        });

        const rows = Array.isArray(response.data.data)
          ? response.data.data
          : [];

        setStoreProducts(
          rows.map((wp: WarehouseProduct) => ({
            id: wp.id,
            name: wp.product?.name ?? '',
            price: 0,
            stock: wp.stock ?? 0,
            buyCost: wp.product?.buyCost,
            basePrice: wp.product?.basePrice,
          }))
        );
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setPage(response.data.page || targetPage);
      } catch (error) {
        console.error('❌ Error fetching warehouse products:', error);
        setStoreProducts([]);
        setTotal(0);
        setTotalPages(1);
        if (isUnauthorizedError(error)) return;
        if (isForbiddenError(error)) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para ver productos.',
          });
        } else {
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los productos',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }

      return;
    }

    const storeId = selectedStoreId || currentStore?.id;
    if (!storeId) {
      return;
    }

    if (!canViewProducts) {
      setStoreProducts([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await storeProductService.getStoreProductsList({
        storeId,
        page: targetPage,
        pageSize: PAGE_SIZE,
        name: nameFilter.trim() || undefined,
        sku: skuFilter.trim() || undefined,
        inStock: hideOutOfStock ? true : undefined,
      });

      setStoreProducts(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setPage(response.page || targetPage);
    } catch (error) {
      console.error('❌ Error fetching store products:', error);
      setStoreProducts([]);
      setTotal(0);
      setTotalPages(1);
      if (isUnauthorizedError(error)) return;
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para ver productos.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los productos',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isWarehouseMode, selectedStoreId, currentStore?.id, nameFilter, skuFilter, hideOutOfStock, toast, canViewProducts]);

  const fetchStoreProductsRef = useRef(fetchStoreProducts);

  useEffect(() => {
    fetchStoreProductsRef.current = fetchStoreProducts;
  }, [fetchStoreProducts]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedStoreId('');
      setStoreQuery('');
      setStoreProducts([]);
      setTotal(0);
      setTotalPages(1);
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const filtersKey = useMemo(() => {
    return [nameFilter, skuFilter, hideOutOfStock].join('|');
  }, [nameFilter, skuFilter, hideOutOfStock]);

  const clearFilters = () => {
    setNameFilter('');
    setNameQuery('');
    setShowNameSuggestions(false);
    setSkuFilter('');
    setSkuQuery('');
    setShowSkuSuggestions(false);
    setHideOutOfStock(true);
    // Forzar recarga después de limpiar filtros
    setTimeout(() => {
      fetchStoreProductsRef.current?.();
    }, 0);
  };

  const activeStoreId = selectedStoreId || currentStore?.id || '';
  const hasFetchedInitialRef = useRef(false);
  const lastStoreIdRef = useRef<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (isWarehouseMode) {
      if (hasFetchedInitialRef.current) return;
      hasFetchedInitialRef.current = true;
      filtersInitializedRef.current = true;
      fetchStoreProductsRef.current?.(1);
      return;
    }

    if (!activeStoreId) {
      return;
    }

    if (lastStoreIdRef.current === activeStoreId && hasFetchedInitialRef.current) {
      return;
    }

    lastStoreIdRef.current = activeStoreId;
    hasFetchedInitialRef.current = true;
    filtersInitializedRef.current = true;
    fetchStoreProductsRef.current?.(1);
  }, [isAuthenticated, activeStoreId, isWarehouseMode]);

  const loadProductLookup = useCallback(async () => {
    if (!isAuthenticated) {
      setNameSuggestions([]);
      return;
    }

    try {
      setNameLookupLoading(true);
      const lookup = await storeProductService.getCatalogProductsLookup('');
      setNameSuggestions(Array.isArray(lookup) ? lookup : []);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
      console.error('Error loading product name lookup:', error);
      setNameSuggestions([]);
    } finally {
      setNameLookupLoading(false);
    }
  }, [isAuthenticated]);

  const loadSkuLookup = useCallback(async (search = '') => {
    if (!isAuthenticated) {
      setSkuSuggestions([]);
      return;
    }

    try {
      setSkuLookupLoading(true);
      const lookup = await storeProductService.getCatalogProductSkuLookup(search);
      setSkuSuggestions(Array.isArray(lookup) ? lookup : []);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
      console.error('Error loading SKU lookup:', error);
      setSkuSuggestions([]);
    } finally {
      setSkuLookupLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProductLookup();
  }, [loadProductLookup]);

  useEffect(() => {
    if (!skuQuery.trim()) {
      setSkuSuggestions([]);
      return;
    }
    loadSkuLookup(skuQuery.trim());
  }, [skuQuery, loadSkuLookup]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameInputWrapperRef.current && !nameInputWrapperRef.current.contains(event.target as Node)) {
        setShowNameSuggestions(false);
      }
      if (skuInputWrapperRef.current && !skuInputWrapperRef.current.contains(event.target as Node)) {
        setShowSkuSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (nameFilter.trim()) {
      setPage(1);
      fetchStoreProductsRef.current?.(1);
    }
  }, [isAuthenticated, nameFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (skuFilter.trim()) {
      setPage(1);
      fetchStoreProductsRef.current?.(1);
    }
  }, [isAuthenticated, skuFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setPage(1);
    fetchStoreProductsRef.current?.(1);
  }, [isAuthenticated, hideOutOfStock]);

  // Debug: verificar estado actual
  useEffect(() => {
  }, [loading, storeProducts.length, total, page, totalPages, isAuthenticated, currentStore?.id, selectedStoreId, nameFilter]);

  const visibleProducts = useMemo(() => {
    return storeProducts;
  }, [storeProducts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'buyCost' || name === 'basePrice' || name === 'price' || name === 'stock' || name === 'stockThreshold'
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isWarehouseMode && !currentStore) return;

    if (isSavingProduct) return;

    if (!isEditing) {
      if (isWarehouseMode) {
        if (!canCreateWarehouseProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para crear productos en el almacén.',
          });
          return;
        }
      } else if (!canCreateProducts) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para crear productos.',
        });
        return;
      }
    } else {
      if (isWarehouseMode) {
        if (!canManageWarehouseProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para editar productos del almacén.',
          });
          return;
        }
      } else if (!canManageProducts && !canManagePrices) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para editar productos.',
        });
        return;
      }
    }

    if (isEditing && originalStock !== null && formData.stock < originalStock) {
      toast({
        title: 'Error',
        description: 'No se puede reducir el stock desde aquí. Use la sección de Inventario.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingProduct(true);
      setCreateErrorMessage(null);
      if (isWarehouseMode) {
        if (isEditing && currentStoreProduct) {
          const updateDto: any = {
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          };

          if (canManageProducts) {
            updateDto.name = formData.name;
            updateDto.description = formData.description;
            updateDto.sku = formData.sku || undefined;
          }

          if (canManagePricesEffective) {
            updateDto.basePrice = formData.basePrice;
            if (canViewProductCostEffective) {
              updateDto.buyCost = formData.buyCost;
            }
          }

          await domainApi.patch(`/warehouse/products/${currentStoreProduct.id}`, updateDto);

          toast({
            title: 'Producto actualizado',
            description: 'El producto se ha actualizado correctamente',
          });
        } else {
          await domainApi.post('/warehouse/products', {
            createNewProduct: true,
            name: formData.name,
            description: formData.description,
            sku: formData.sku || undefined,
            basePrice: formData.basePrice,
            buyCost: formData.buyCost,
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          });

          toast({
            title: 'Producto creado',
            description: 'El producto se ha creado correctamente',
          });
          await loadProductLookup();
        }

        await fetchStoreProducts();
        resetForm();
        setIsModalOpen(false);
        return;
      }

      let productData: CreateStoreProductRequest;

      if (isEditing && currentStoreProduct) {
        let updateData: any;
        updateData = {};

        if (canManageProducts) {
          updateData.name = formData.name;
          updateData.description = formData.description;
          updateData.sku = formData.sku || undefined;
          updateData.stockThreshold = formData.stockThreshold;
        }

        if (canManagePricesEffective) {
          updateData.price = formData.price;
          updateData.basePrice = formData.basePrice;
          if (canViewProductCostEffective) {
            updateData.buyCost = formData.buyCost;
          }
        }

        if (canManageInventory) {
          updateData.stock = formData.stock;
        }
        await storeProductService.updateStoreProduct(currentStoreProduct.id, updateData);

        toast({
          title: 'Producto actualizado',
          description: 'El producto se ha actualizado correctamente',
        });
      } else {
        if (!canCreateProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para crear productos.',
          });
          return;
        }

        if (!currentStore) return;
        productData = {
          createNewProduct: true,
          name: formData.name,
          description: formData.description,
          sku: formData.sku || undefined,
          storeId: currentStore.id,
          stockThreshold: formData.stockThreshold,
          stock: formData.stock,
          price: formData.price,
          ...(canManagePricesEffective ? { basePrice: formData.basePrice } : {}),
          ...(canManagePricesEffective && canViewProductCostEffective ? { buyCost: formData.buyCost } : {}),
        } as CreateStoreProductRequest;

        await storeProductService.createStoreProduct(productData);

        toast({
          title: 'Producto creado',
          description: 'El producto se ha creado correctamente',
        });

        await loadProductLookup();
        await loadSkuLookup();
      }

      await fetchStoreProducts();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      const responseData = (error as any)?.response?.data;
      const statusFromResponse = (error as any)?.response?.status;
      const statusFromPayload = typeof responseData?.statusCode === 'number'
        ? responseData.statusCode
        : undefined;
      const status = statusFromResponse ?? statusFromPayload;
      const rawMessage = Array.isArray(responseData?.message)
        ? responseData.message.join(' ')
        : typeof responseData?.message === 'string'
          ? responseData.message
          : typeof responseData?.error === 'string'
            ? responseData.error
            : '';
      const normalizedMessage = rawMessage.toLowerCase();
      const isSkuConflict = !isWarehouseMode && (
        status === 409 ||
        normalizedMessage.includes('sku')
      );

      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para realizar esta acción.',
        });
      } else if (isSkuConflict) {
        const skuValue = (formData.sku ?? '').trim();
        const fallbackMessage = rawMessage || 'Ya existe un producto con ese SKU en este tenant.';
        if (skuValue) {
          try {
            const skuMatch = await storeProductService.getCatalogProductBySku(skuValue);
            if (skuMatch) {
              setCreateErrorMessage(`El SKU ya está asignado a: <strong>${skuMatch.name}</strong> (${skuMatch.sku ?? skuValue}).`);
              sonnerToast.error('SKU en uso', {
                description: `El SKU ya está asignado a: ${skuMatch.name} (${skuMatch.sku ?? skuValue}).`,
              });
              return;
            }
          } catch (lookupError) {
            console.error('Error buscando SKU en catálogo:', lookupError);
          }
        }
        setCreateErrorMessage(fallbackMessage);
        sonnerToast.error('SKU en uso', {
          description: fallbackMessage,
        });
      } else {
        console.error('Error al guardar producto:', error);
        setCreateErrorMessage(rawMessage || 'No se pudo guardar el producto.');
        toast({
          title: 'Error',
          description: rawMessage || 'No se pudo guardar el producto',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSavingProduct(false);
    }
  }, [
    isWarehouseMode,
    currentStore,
    isEditing,
    currentStoreProduct,
    formData,
    fetchStoreProducts,
    toast,
    loadProductLookup,
    canCreateProducts,
    canManageProducts,
    canManagePrices,
    canViewProductCost,
    canManageInventory,
    canManageWarehouseProducts,
    nameSuggestions,
    canCreateWarehouseProducts,
    isSavingProduct,
    isAdmin,
    originalStock,
    canManagePricesEffective,
    canViewProductCostEffective,
  ]);

  const loadProductDetail = useCallback(async (productId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const formatValue = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toString() : String(value);
      };
      if (isWarehouseMode) {
        const detailResponse = await domainApi.get<WarehouseProduct>(`/warehouse/products/${productId}`);
        const detail = detailResponse.data;
        const resolvedStockThreshold = typeof detail.stockThreshold === 'number'
          ? detail.stockThreshold
          : undefined;

        setProductDetail(detail as any);
        setDetailForm({
          name: detail.product?.name || '',
          description: detail.product?.description || '',
          sku: detail.product?.sku || '',
          price: '',
          buyCost: formatValue(detail.product?.buyCost),
          basePrice: formatValue(detail.product?.basePrice),
          stockThreshold: formatValue(resolvedStockThreshold),
        });
      } else {
        const detail = await storeProductService.getStoreProductDetail(productId);
        const resolvedStockThreshold = typeof detail.stockThreshold === 'number'
          ? detail.stockThreshold
          : undefined;
        const normalizedDetail: StoreProductDetail = {
          ...detail,
          stockThreshold: resolvedStockThreshold,
          productId: detail.productId ?? detail.product?.id,
        };
        setProductDetail(normalizedDetail);
        setDetailForm({
          name: detail.product?.name || '',
          description: detail.product?.description || '',
          price: formatValue(detail.price),
          buyCost: formatValue(detail.product?.buyCost),
          basePrice: formatValue(detail.product?.basePrice),
          stockThreshold: formatValue(resolvedStockThreshold),
          sku: detail.product?.sku || '',
        });
      }
    } catch (error) {
      console.error('Error loading product detail:', error);
      setDetailError('No se pudo cargar el detalle del producto.');
    } finally {
      setDetailLoading(false);
    }
  }, [isWarehouseMode]);

  const openProductDetail = (productId: string) => {
    if (isWarehouseMode) {
      if (!canManageWarehouseProducts) {
        toast({
          title: 'Permiso requerido',
          description: 'No tienes permisos para ver el detalle del producto del almacén.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedProductId(productId);
      setDetailModalOpen(true);
      loadProductDetail(productId);
      return;
    }

    if (!canManageProducts) {
      toast({
        title: 'Permiso requerido',
        description: 'No tienes permisos para ver el detalle del producto (MANAGE_PRODUCTS requerido).',
        variant: 'destructive',
      });
      return;
    }
    setSelectedProductId(productId);
    setDetailModalOpen(true);
    loadProductDetail(productId);
  };

  const closeProductDetail = () => {
    if (isUpdatingDetail || isDeletingStoreProduct || isDeletingCatalogProduct) return;
    setDetailModalOpen(false);
    setSelectedProductId(null);
    setProductDetail(null);
    setDetailForm({ name: '', description: '', sku: '', price: '', buyCost: '', basePrice: '', stockThreshold: '' });
    setDetailError(null);
    setCatalogDeleteCredentials({ email: '', password: '' });
    setShowCatalogDeleteForm(false);
  };

  const handleDetailFormChange = (field: keyof typeof detailForm, value: string) => {
    setDetailForm(prev => ({ ...prev, [field]: value }));
  };

  const isValidNumberInputValue = (value: string) => {
    return value === '' || /^-?\d*(\.\d*)?$/.test(value);
  };

  const handleUpdateDetail = async () => {
    if (!selectedProductId) return;
    setIsUpdatingDetail(true);
    try {
      if (isWarehouseMode) {
        if (!canManageWarehouseProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para editar este producto del almacén.',
          });
          return;
        }

        const warehousePayload: any = {};
        if (detailForm.stockThreshold !== '') {
          warehousePayload.stockThreshold = Number(detailForm.stockThreshold);
        }

        if (canManageProducts) {
          warehousePayload.name = detailForm.name;
          warehousePayload.description = detailForm.description;
          warehousePayload.sku = detailForm.sku || undefined;
        }

        if (canManagePricesEffective) {
          if (detailForm.basePrice !== '') {
            warehousePayload.basePrice = Number(detailForm.basePrice);
          }
          if (canViewProductCostEffective) {
            if (detailForm.buyCost !== '') {
              warehousePayload.buyCost = Number(detailForm.buyCost);
            }
          }
        }

        await domainApi.patch(`/warehouse/products/${selectedProductId}`, warehousePayload);

        toast({
          title: 'Producto actualizado',
          description: 'Los cambios se guardaron correctamente.',
        });

        fetchStoreProducts(page);
        closeProductDetail();
        return;
      }

      if (!canManageProducts && !canManagePrices) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para editar este producto.',
        });
        return;
      }

      const payload: any = {};
      if (canManageProducts) {
        payload.name = detailForm.name;
        payload.description = detailForm.description;
        payload.sku = detailForm.sku || undefined;
        if (detailForm.stockThreshold !== '') {
          payload.stockThreshold = Number(detailForm.stockThreshold);
        }
      }
      if (canManagePrices) {
        if (detailForm.price !== '') payload.price = Number(detailForm.price);
        if (detailForm.basePrice !== '') payload.basePrice = Number(detailForm.basePrice);
        if (canViewProductCost) {
          if (detailForm.buyCost !== '') payload.buyCost = Number(detailForm.buyCost);
        }
      }
      await storeProductService.updateStoreProduct(selectedProductId, payload);

      toast({
        title: 'Producto actualizado',
        description: 'Los cambios se guardaron correctamente.',
      });

      fetchStoreProducts(page);
      closeProductDetail();
    } catch (error) {
      console.error('Error updating product detail:', error);
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para actualizar este producto.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el producto.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUpdatingDetail(false);
    }
  };

  const handleDeleteStoreProductDetail = async () => {
    if (!selectedProductId) return;
    if (isWarehouseMode) {
      if (!isAdmin) {
        toast({
          title: 'Sin permisos',
          description: 'Solo ADMIN puede eliminar productos del almacén.',
        });
        return;
      }
      const shouldDelete = window.confirm('¿Deseas eliminar este producto del almacén?');
      if (!shouldDelete) return;

      setIsDeletingStoreProduct(true);
      try {
        await domainApi.delete(`/warehouse/products/${selectedProductId}`);
        toast({
          title: 'Producto eliminado',
          description: 'Se eliminó el producto del almacén.',
        });
        closeProductDetail();
        fetchStoreProducts(page);
      } catch (error) {
        console.error('Error deleting warehouse product:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto del almacén.',
          variant: 'destructive',
        });
      } finally {
        setIsDeletingStoreProduct(false);
      }
      return;
    }

    if (!canDeleteProducts) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para eliminar productos.',
      });
      return;
    }
    const shouldDelete = window.confirm(
      'Se recomienda dejar el stock en 0 antes de eliminar un producto de la tienda.\n¿Deseas continuar igualmente?'
    );
    if (!shouldDelete) return;

    setIsDeletingStoreProduct(true);
    try {
      await storeProductService.deleteStoreProduct(selectedProductId);
      toast({
        title: 'Producto eliminado',
        description: 'Se eliminó el producto de esta tienda.',
      });
      closeProductDetail();
      fetchStoreProducts(page);
    } catch (error) {
      console.error('Error deleting store product:', error);
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para eliminar este producto.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto de la tienda.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeletingStoreProduct(false);
    }
  };

  const handleDeleteCatalogProductDetail = async () => {
    if (isWarehouseMode) {
      toast({
        title: 'Acción no disponible',
        description: 'En modo almacén no se permite eliminar productos del catálogo global desde esta pantalla.',
      });
      return;
    }
    if (!canDeleteProducts) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para eliminar productos.',
      });
      return;
    }
    const catalogProductId = productDetail?.productId ?? productDetail?.product?.id;
    if (!catalogProductId) {
      toast({
        title: 'Acción no disponible',
        description: 'El identificador del producto en catálogo no está disponible.',
        variant: 'destructive',
      });
      return;
    }
    if (!catalogDeleteCredentials.email || !catalogDeleteCredentials.password) {
      toast({
        title: 'Datos incompletos',
        description: 'Ingresa el correo y contraseña para confirmar la eliminación del catálogo.',
        variant: 'destructive',
      });
      return;
    }

    const shouldDelete = window.confirm(
      'Eliminar del catálogo borrará el producto en todas las tiendas. Se recomienda dejar stock en 0 antes de continuar.\n¿Deseas eliminarlo definitivamente?'
    );
    if (!shouldDelete) return;

    setIsDeletingCatalogProduct(true);
    try {
      await storeProductService.deleteCatalogProduct(catalogProductId, catalogDeleteCredentials);
      toast({
        title: 'Producto eliminado del catálogo',
        description: 'El producto se eliminó de todas las tiendas.',
      });
      closeProductDetail();
      fetchStoreProducts(1);
    } catch (error) {
      console.error('Error deleting catalog product:', error);
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para eliminar este producto del catálogo.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto del catálogo.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeletingCatalogProduct(false);
    }
  };

  const handleEdit = useCallback((storeProduct: StoreProduct) => {
    setCurrentStoreProduct(storeProduct);
    setOriginalStock(storeProduct.stock); // Guardar stock original
    setFormData({
      name: storeProduct.product.name,
      description: storeProduct.product.description || '',
      sku: storeProduct.product.sku || '',
      buyCost: storeProduct.product.buyCost || 0,
      basePrice: storeProduct.product.basePrice || 0,
      price: storeProduct.price || 0,
      stock: storeProduct.stock,
      stockThreshold: storeProduct.stockThreshold,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  }, []);

  const openNewProductModal = () => {
    setShowNameSuggestions(false);
    setCreateErrorMessage(null);
    setCurrentStoreProduct(null);
    setOriginalStock(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      buyCost: 0,
      basePrice: 0,
      price: 0,
      stock: 0,
      stockThreshold: 1,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleQRScanProducts = useCallback(async (code: string) => {
    const sku = code.trim();

    if (detailModalOpen) {
      const savedAction = localStorage.getItem('qr_products_detail_open_action') ?? 'ask';
      if (savedAction === 'replace') {
        handleDetailFormChange('sku', sku);
        sonnerToast.success(`SKU actualizado a: ${sku}`);
        return;
      }
      if (savedAction === 'ignore') return;
      setSkuReplaceCode(sku);
      setSkuReplaceRemember(false);
      setSkuReplaceModalOpen(true);
      return;
    }

    const found = storeProducts.find(
      (p) => ((p as any).sku ?? '').trim().toLowerCase() === sku.toLowerCase()
    );
    if (found) {
      openProductDetail(found.id);
      return;
    }

    try {
      const storeIdForLookup = selectedStoreId || currentStore?.id || '';
      const simple = await storeProductService.getStoreProductsSimple(storeIdForLookup, { sku });
      const match = Array.isArray(simple?.data) ? simple.data[0] : undefined;
      if (match?.id) {
        openProductDetail(match.id);
        return;
      }
    } catch { /* ignorar errores de red */ }

    try {
      await storeProductService.getCatalogProductSkuLookup(sku);
    } catch { /* ignorar errores de red */ }

    const savedAction = localStorage.getItem('qr_products_not_found_action') ?? 'ask';
    if (savedAction === 'create') {
      openNewProductModal();
      setFormData((prev) => ({ ...prev, sku }));
      return;
    }
    if (savedAction === 'ignore') return;
    setSkuNotFoundCode(sku);
    setSkuNotFoundRemember(false);
    setSkuNotFoundModalOpen(true);
  }, [detailModalOpen, storeProducts, openProductDetail, openNewProductModal, selectedStoreId, currentStore?.id]);

  const handleConfirmSkuNotFound = async () => {
    if (skuNotFoundRemember) {
      localStorage.setItem('qr_products_not_found_action', 'create');
    }
    openNewProductModal();
    setFormData((prev) => ({ ...prev, sku: skuNotFoundCode }));
    try {
      const result = await productService.lookupExternal(skuNotFoundCode);
      if (result.found && result.data) {
        setFormData((prev) => ({
          ...prev,
          sku: skuNotFoundCode,
          ...(result.data!.name ? { name: result.data!.name } : {}),
          ...(result.data!.description ? { description: result.data!.description } : {}),
        }));
      }
    } catch { /* ignorar */ }
    setSkuNotFoundModalOpen(false);
    setSkuNotFoundCode('');
  };

  const handleCancelSkuNotFound = () => {
    setSkuNotFoundModalOpen(false);
    setSkuNotFoundCode('');
    setSkuNotFoundRemember(false);
  };

  const handleConfirmSkuReplace = () => {
    if (skuReplaceRemember) {
      localStorage.setItem('qr_products_detail_open_action', 'replace');
    }
    handleDetailFormChange('sku', skuReplaceCode);
    sonnerToast.success(`SKU actualizado a: ${skuReplaceCode}`);
    setSkuReplaceModalOpen(false);
    setSkuReplaceCode('');
  };

  const handleConfirmSkuReplaceAndSave = async () => {
    if (skuReplaceRemember) {
      localStorage.setItem('qr_products_detail_open_action', 'replace');
    }
    const nextSku = skuReplaceCode;
    handleDetailFormChange('sku', nextSku);
    setSkuReplaceModalOpen(false);
    setSkuReplaceCode('');
    if (!selectedProductId) return;

    setIsUpdatingDetail(true);
    try {
      if (isWarehouseMode) {
        if (!canManageWarehouseProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para editar este producto del almacén.',
          });
          return;
        }

        const warehousePayload: any = {};
        if (detailForm.stockThreshold !== '') {
          warehousePayload.stockThreshold = Number(detailForm.stockThreshold);
        }

        if (canManageProducts) {
          warehousePayload.name = detailForm.name;
          warehousePayload.description = detailForm.description;
          warehousePayload.sku = nextSku || undefined;
        }

        if (canManagePricesEffective) {
          if (detailForm.basePrice !== '') {
            warehousePayload.basePrice = Number(detailForm.basePrice);
          }
          if (canViewProductCostEffective) {
            if (detailForm.buyCost !== '') {
              warehousePayload.buyCost = Number(detailForm.buyCost);
            }
          }
        }

        await domainApi.patch(`/warehouse/products/${selectedProductId}`, warehousePayload);

        toast({
          title: 'Producto actualizado',
          description: 'Los cambios se guardaron correctamente.',
        });

        fetchStoreProducts(page);
        closeProductDetail();
        return;
      }

      if (!canManageProducts && !canManagePrices) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para editar este producto.',
        });
        return;
      }

      const payload: any = {};
      if (canManageProducts) {
        payload.name = detailForm.name;
        payload.description = detailForm.description;
        payload.sku = nextSku || undefined;
        if (detailForm.stockThreshold !== '') {
          payload.stockThreshold = Number(detailForm.stockThreshold);
        }
      }
      if (canManagePrices) {
        if (detailForm.price !== '') payload.price = Number(detailForm.price);
        if (detailForm.basePrice !== '') payload.basePrice = Number(detailForm.basePrice);
        if (canViewProductCost) {
          if (detailForm.buyCost !== '') payload.buyCost = Number(detailForm.buyCost);
        }
      }

      await storeProductService.updateStoreProduct(selectedProductId, payload);

      toast({
        title: 'Producto actualizado',
        description: 'Los cambios se guardaron correctamente.',
      });

      fetchStoreProducts(page);
      closeProductDetail();
    } catch (error) {
      console.error('Error updating product detail:', error);
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para actualizar este producto.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el producto.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUpdatingDetail(false);
    }
  };

  const handleCancelSkuReplace = () => {
    setSkuReplaceModalOpen(false);
    setSkuReplaceCode('');
    setSkuReplaceRemember(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      buyCost: 0,
      basePrice: 0,
      price: 0,
      stock: 0,
      stockThreshold: 1,
      sku: '',
    });
    setCreateErrorMessage(null);
    setCurrentStoreProduct(null);
    setOriginalStock(null);
    setIsEditing(false);
  };

  if (!isAuthenticated || (!currentStore && !currentWarehouse)) {
    return null;
  }

  if (!canViewProducts) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Productos</h1>
        <p className="text-muted-foreground">
          No tienes permisos para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">{isWarehouseMode ? (currentWarehouse?.name ?? '') : (currentStore?.name ?? '')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(isWarehouseMode ? canCreateWarehouseProducts : canCreateProducts) && (
            <Button onClick={openNewProductModal} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          )}
          <QRScanner
            mode="both"
            enabled={true}
            onScan={handleQRScanProducts}
            onError={(error) => sonnerToast.error(error)}
            buttonLabel="Escanear"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Producto</Label>
            <div className="relative" ref={nameInputWrapperRef}>
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setShowNameSuggestions(true);
                  } else {
                    setShowNameSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (nameQuery.trim()) {
                    setShowNameSuggestions(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setNameFilter(nameQuery);
                    setShowNameSuggestions(false);
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setShowNameSuggestions(false);
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                placeholder={nameLookupLoading ? 'Buscando...' : 'Buscar producto...'}
                className="pl-8 h-10"
              />
              {nameQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setNameQuery('');
                    setNameFilter('');
                    setShowNameSuggestions(false);
                  }}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}

              {showNameSuggestions && nameQuery.trim() && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                  <div className="max-h-64 overflow-auto">
                    {filteredNameSuggestions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        {nameQuery ? 'No se encontraron productos' : 'Escribe para buscar'}
                      </div>
                    ) : (
                      filteredNameSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNameQuery(item.name);
                            setNameFilter(item.name);
                            setShowNameSuggestions(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                        >
                          <span>{item.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">SKU</Label>
            <div className="relative" ref={skuInputWrapperRef}>
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={skuQuery}
                onChange={(e) => {
                  setSkuQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setShowSkuSuggestions(true);
                  } else {
                    setShowSkuSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (skuQuery.trim()) {
                    setShowSkuSuggestions(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSkuFilter(skuQuery);
                    setShowSkuSuggestions(false);
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setShowSkuSuggestions(false);
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                placeholder={skuLookupLoading ? 'Buscando...' : 'Buscar SKU...'}
                className="pl-8 h-10"
              />
              {skuQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSkuQuery('');
                    setSkuFilter('');
                    setShowSkuSuggestions(false);
                  }}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}

              {showSkuSuggestions && skuQuery.trim() && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                  <div className="max-h-64 overflow-auto">
                    {filteredSkuSuggestions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        {skuQuery ? 'No se encontraron SKUs' : 'Escribe para buscar'}
                      </div>
                    ) : (
                      filteredSkuSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSkuQuery(item.sku);
                            setSkuFilter(item.sku);
                            setShowSkuSuggestions(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                        >
                          <span>{item.sku}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ActiveFilters 
          hasActiveFilters={!!(nameFilter || skuFilter || !hideOutOfStock)}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Mostrando {visibleProducts.length} de {total} productos
            {nameFilter.trim() && ` (filtrados por "${nameFilter}")`}
            {hideOutOfStock && ' (sin stock oculto)'}
          </span>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-out-of-stock"
              checked={hideOutOfStock}
              onCheckedChange={(checked: boolean) => setHideOutOfStock(checked)}
            />
            <Label 
              htmlFor="hide-out-of-stock" 
              className="text-sm font-medium cursor-pointer"
            >
              Ocultar sin stock
            </Label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">
            {nameFilter.trim()
              ? `No se encontraron productos que coincidan con "${nameFilter}"`
              : hideOutOfStock
                ? (isWarehouseMode ? "No hay productos con stock en este almacén" : "No hay productos con stock en esta tienda")
                : (isWarehouseMode ? "No hay productos en este almacén" : "No hay productos en esta tienda")
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {visibleProducts.map((storeProduct) => (
              <Card
                key={storeProduct.id}
                className={`h-full flex flex-col transition hover:border-primary ${(isWarehouseMode ? canManageWarehouseProducts : canManageProducts) ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                onClick={() => openProductDetail(storeProduct.id)}
              >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm sm:text-base leading-tight">{storeProduct.name}</CardTitle>
                </div>
                <div className="space-y-2">
                  {!isWarehouseMode && (canViewProductPrices || canManagePrices) && typeof storeProduct.price === 'number' && (
                    <p className="text-lg sm:text-xl font-bold text-primary">
                      S/ {storeProduct.price.toFixed(2)}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className={`font-medium ${
                      storeProduct.stock <= 0
                        ? 'text-destructive'
                        : 'text-success'
                    }`}>
                      {storeProduct.stock} unidades
                    </span>
                    {storeProduct.stock <= 0 && (
                      <span className="text-destructive text-xs">
                        ⚠️ Stock bajo
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-0">                
                {!isWarehouseMode && canViewProductCost && (storeProduct.buyCost !== undefined) && (storeProduct.price !== undefined) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Costo: S/ {(storeProduct.buyCost || 0).toFixed(2)}</p>
                    <p>Ganancia: S/ {((storeProduct.price || 0) - (storeProduct.buyCost || 0)).toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Página {page} de {totalPages}
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const next = page - 1;
                    if (next < 1) return;
                    setPage(next);
                    fetchStoreProducts(next);
                  }}
                  className="h-9 px-4"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    const next = page + 1;
                    if (next > totalPages) return;
                    setPage(next);
                    fetchStoreProducts(next);
                  }}
                  className="h-9 px-4"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar producto */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) setIsModalOpen(false);
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[860px] lg:max-w-[1020px] max-h-[92vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[92vh]">

            {/* ── Header ── */}
            <DialogHeader className="px-6 pt-5 pb-4 flex-shrink-0 border-b bg-muted/30">
              <DialogTitle className="text-lg sm:text-xl leading-tight">
                {isEditing ? 'Editar producto' : 'Nuevo producto'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {isEditing
                  ? 'Modifica los datos del producto y guarda los cambios.'
                  : 'Completa la información para registrar un nuevo producto.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto">
                {createErrorMessage && (
                  <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" dangerouslySetInnerHTML={{ __html: createErrorMessage }} />
                )}
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x">

                  {/* ── Left: Identificación ── */}
                  <div className="flex-1 min-w-0 px-6 py-5 space-y-6">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identificación</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            Nombre <span className="text-destructive">*</span>
                          </label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            disabled={isWarehouseMode ? (isEditing ? !isAdmin : false) : !canCreateProducts}
                            className="h-10"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            SKU / Código de barras
                          </label>
                          <Input
                            name="sku"
                            value={formData.sku}
                            onChange={handleInputChange}
                            placeholder="Ej: SKU-ACEITE-10W40"
                            maxLength={120}
                            disabled={isWarehouseMode ? !isAdmin : !canCreateProducts}
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Opcional. Se usa para búsqueda con pistola lectora o cámara QR.
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            Descripción
                          </label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isWarehouseMode ? !isAdmin : !canCreateProducts}
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ── Right: Precios + Inventario + Acciones ── */}
                  <div className="lg:w-[280px] xl:w-[300px] flex-shrink-0 px-6 py-5 space-y-6 bg-muted/20">

                    {/* Precios */}
                    {(!isWarehouseMode || isAdmin) && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Precios</p>
                        <div className="space-y-4">
                          {!isWarehouseMode && (
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Precio de venta <span className="text-destructive">*</span>
                              </label>
                              <Input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                required={canManagePricesEffective}
                                disabled={!canManagePricesEffective}
                                className="h-10"
                              />
                              {!canManagePricesEffective && (
                                <p className="text-xs text-muted-foreground mt-1">Sin permisos para establecer precios.</p>
                              )}
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium mb-1">Precio base</label>
                            <Input
                              type="number"
                              name="basePrice"
                              value={formData.basePrice}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              disabled={isWarehouseMode ? !isAdmin : !canManagePricesEffective}
                              className="h-10"
                            />
                          </div>
                          {canViewProductCostEffective && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Costo de compra</label>
                              <Input
                                type="number"
                                name="buyCost"
                                value={formData.buyCost}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                disabled={isWarehouseMode ? !isAdmin : !canManagePricesEffective}
                                className="h-10"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inventario */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventario</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Stock inicial <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleInputChange}
                            min={isEditing && originalStock !== null ? originalStock : 0}
                            placeholder="0"
                            required
                            disabled={isWarehouseMode ? isEditing : (isEditing ? !canManageInventory : !canCreateProducts)}
                            className="h-10"
                          />
                          {isEditing && originalStock !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Solo se permite aumentar el stock desde aquí.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Alerta de stock</label>
                          <Input
                            type="number"
                            name="stockThreshold"
                            value={formData.stockThreshold}
                            onChange={handleInputChange}
                            min="1"
                            placeholder="1"
                            required
                            disabled={isWarehouseMode ? (!canManageWarehouseProducts && isEditing) : !canCreateProducts}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex flex-col sm:flex-row justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto h-10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingProduct}
                  className="w-full sm:w-auto h-10"
                >
                  {isSavingProduct ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? 'Guardando...' : 'Creando...'}</>
                  ) : (isEditing ? 'Guardar cambios' : 'Crear producto')}
                </Button>
              </div>
            </form>

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={(open) => {
        if (!open) closeProductDetail();
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[860px] lg:max-w-[1020px] max-h-[92vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[92vh]">

            {/* ── Header ── */}
            <DialogHeader className="px-6 pt-5 pb-4 flex-shrink-0 border-b bg-muted/30">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl leading-tight truncate">
                    {detailForm.name || 'Detalle del producto'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {detailForm.sku?.trim() && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                        SKU: {detailForm.sku}
                      </span>
                    )}
                    <DialogDescription className="text-xs text-muted-foreground m-0">
                      {isWarehouseMode ? 'Producto en almacén' : 'Producto en tienda'}
                    </DialogDescription>
                  </div>
                </div>
                <QRScanner
                  mode="both"
                  enabled={true}
                  onScan={handleQRScanProducts}
                  onError={(error) => sonnerToast.error(error)}
                  buttonLabel="Escanear"
                />
              </div>
            </DialogHeader>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando información...</p>
                </div>
              ) : detailError ? (
                <div className="px-6 py-8">
                  <p className="text-sm text-destructive">{detailError}</p>
                </div>
              ) : productDetail ? (
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x">

                  {/* ── Left: form ── */}
                  <div className="flex-1 min-w-0 px-6 py-5 space-y-6">

                    {/* Sección: Identificación */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identificación</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-sm font-medium">Nombre</Label>
                          <Input
                            value={detailForm.name}
                            onChange={(e) => handleDetailFormChange('name', e.target.value)}
                            disabled={isWarehouseMode ? (!isAdmin || isUpdatingDetail) : (isUpdatingDetail || !canManageProducts)}
                            className="h-10 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">SKU</Label>
                          {((isWarehouseMode ? isAdmin : canManageProducts) && !isUpdatingDetail) ? (
                            <Input
                              value={detailForm.sku}
                              onChange={(e) => handleDetailFormChange('sku', e.target.value)}
                              maxLength={120}
                              placeholder="Sin SKU"
                              className="h-10 mt-1"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-2 h-10 flex items-center">
                              {detailForm.sku?.trim() ? detailForm.sku : <span className="italic">Sin SKU</span>}
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-sm font-medium">Descripción</Label>
                          <textarea
                            value={detailForm.description}
                            onChange={(e) => handleDetailFormChange('description', e.target.value)}
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            disabled={isWarehouseMode ? (!isAdmin || isUpdatingDetail) : (isUpdatingDetail || !canManageProducts)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección: Precios */}
                    {(!isWarehouseMode || isAdmin) && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Precios</p>
                        <div className="grid gap-4 sm:grid-cols-3">
                          {!isWarehouseMode && (
                            <div>
                              <Label className="text-sm font-medium">Precio venta</Label>
                              {canViewProductPrices ? (
                                <Input
                                  type="number"
                                  value={detailForm.price}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    if (!isValidNumberInputValue(next)) return;
                                    handleDetailFormChange('price', next);
                                  }}
                                  disabled={isUpdatingDetail || !canManagePrices}
                                  className="h-10 mt-1"
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground mt-2 h-10 flex items-center">—</p>
                              )}
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium">Precio base</Label>
                            {(isWarehouseMode ? true : canViewProductPrices) ? (
                              <Input
                                type="number"
                                value={detailForm.basePrice}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  if (!isValidNumberInputValue(next)) return;
                                  handleDetailFormChange('basePrice', next);
                                }}
                                disabled={isWarehouseMode ? (!isAdmin || isUpdatingDetail) : (isUpdatingDetail || !canManagePrices)}
                                className="h-10 mt-1"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground mt-2 h-10 flex items-center">—</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Costo</Label>
                            {(isWarehouseMode ? true : canViewProductCost) ? (
                              <Input
                                type="number"
                                value={detailForm.buyCost}
                                onChange={(e) => handleDetailFormChange('buyCost', e.target.value)}
                                disabled={isWarehouseMode ? (!isAdmin || isUpdatingDetail) : (isUpdatingDetail || !canManagePrices)}
                                className="h-10 mt-1"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground mt-2 h-10 flex items-center">—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sección: Inventario */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventario</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-sm font-medium">Alerta de stock mínimo</Label>
                          <Input
                            type="number"
                            value={detailForm.stockThreshold}
                            onChange={(e) => handleDetailFormChange('stockThreshold', e.target.value)}
                            disabled={isWarehouseMode ? (isUpdatingDetail || !canManageWarehouseProducts) : (isUpdatingDetail || !canManageProducts)}
                            min="1"
                            className="h-10 mt-1"
                          />
                        </div>
                        <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Stock actual</p>
                            <p className="text-2xl font-bold tabular-nums leading-tight">{productDetail.stock}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/*
                      TODO: Mover la "Zona de peligro" y la eliminación del catálogo a la pestaña dedicada de
                      "Borrar productos". Por ahora se oculta en el modal para evitar exposición accidental.
                    */}
                    {/* {!isWarehouseMode && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-destructive">Zona de peligro</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Eliminar del catálogo quitará el producto de <strong>todas</strong> las tiendas. Deja el stock en 0 antes de continuar.
                            </p>
                          </div>
                          {!showCatalogDeleteForm && canDeleteProducts && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCatalogDeleteCredentials({ email: '', password: '' });
                                setShowCatalogDeleteForm(true);
                              }}
                              disabled={isDeletingCatalogProduct}
                              className="w-full sm:w-auto shrink-0"
                            >
                              Eliminar del catálogo
                            </Button>
                          )}
                        </div>
                        {showCatalogDeleteForm && (
                          <div className="space-y-3 pt-1">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-sm">Correo de confirmación</Label>
                                <Input
                                  type="email"
                                  value={catalogDeleteCredentials.email}
                                  onChange={(e) => setCatalogDeleteCredentials((prev) => ({ ...prev, email: e.target.value }))}
                                  disabled={isDeletingCatalogProduct}
                                  className="h-9 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Contraseña</Label>
                                <Input
                                  type="password"
                                  value={catalogDeleteCredentials.password}
                                  onChange={(e) => setCatalogDeleteCredentials((prev) => ({ ...prev, password: e.target.value }))}
                                  disabled={isDeletingCatalogProduct}
                                  className="h-9 mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCatalogDeleteForm(false);
                                  setCatalogDeleteCredentials({ email: '', password: '' });
                                }}
                                disabled={isDeletingCatalogProduct}
                                className="w-full sm:w-auto"
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCatalogProductDetail();
                                }}
                                disabled={isDeletingCatalogProduct}
                                className="w-full sm:w-auto"
                              >
                                {isDeletingCatalogProduct ? 'Eliminando...' : 'Confirmar eliminación'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )} */}
                  </div>

                  {/* ── Right: info + acciones ── */}
                  <div className="lg:w-[260px] xl:w-[280px] flex-shrink-0 px-6 py-5 space-y-4 bg-muted/20">

                    {/* Info ubicación */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        {isWarehouseMode ? 'Almacén de origen' : 'Tienda de origen'}
                      </p>
                      <div className="space-y-2 text-sm">
                        {!isWarehouseMode && (
                          <>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Nombre</span>
                              <span className="font-medium text-right truncate">{productDetail.store?.name ?? '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Dirección</span>
                              <span className="font-medium text-right text-xs">{productDetail.store?.address ?? '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Teléfono</span>
                              <span className="font-medium text-right">{productDetail.store?.phone ?? '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Responsable</span>
                              <span className="font-medium text-right truncate">{productDetail.user?.name ?? '—'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Acciones</p>
                      <Button
                        className="w-full h-9"
                        onClick={handleUpdateDetail}
                        disabled={isUpdatingDetail || (isWarehouseMode ? !canManageWarehouseProducts : (!canManageProducts && !canManagePrices))}
                      >
                        {isUpdatingDetail ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                        ) : 'Guardar cambios'}
                      </Button>
                      {/*
                        TODO: Mover las acciones de borrado (quitar de tienda/almacén) a una pestaña dedicada
                        dentro de la sección "Borrar productos". Por ahora se ocultan para evitar exposición.
                      */}
                      {/* {(isWarehouseMode ? isAdmin : canDeleteProducts) && (
                        <Button
                          variant="destructive"
                          className="w-full h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStoreProductDetail();
                          }}
                          disabled={isDeletingStoreProduct}
                        >
                          {isDeletingStoreProduct ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
                          ) : (isWarehouseMode ? 'Quitar del almacén' : 'Quitar de la tienda')}
                        </Button>
                      )} */}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex justify-end">
              <Button
                variant="outline"
                onClick={closeProductDetail}
                disabled={isUpdatingDetail || isDeletingStoreProduct || isDeletingCatalogProduct}
                className="w-full sm:w-auto h-10"
              >
                Cerrar
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal A: SKU no encontrado ── */}
      <Dialog open={skuNotFoundModalOpen} onOpenChange={(open) => { if (!open) handleCancelSkuNotFound(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Producto no encontrado</DialogTitle>
            <DialogDescription>
              El código <strong>{skuNotFoundCode}</strong> no está registrado en el sistema. ¿Deseas crear un nuevo producto con este SKU?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="qr-not-found-remember"
              checked={skuNotFoundRemember}
              onCheckedChange={(checked) => setSkuNotFoundRemember(checked === true)}
            />
            <Label htmlFor="qr-not-found-remember" className="text-sm cursor-pointer">
              Recordar mi decisión
            </Label>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCancelSkuNotFound} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleConfirmSkuNotFound} className="w-full sm:w-auto">
              Crear producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal B: Reemplazar SKU ── */}
      <Dialog open={skuReplaceModalOpen} onOpenChange={(open) => { if (!open) handleCancelSkuReplace(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Código escaneado</DialogTitle>
            <DialogDescription>
              Se escaneó el código <strong>{skuReplaceCode}</strong>. ¿Deseas actualizar el SKU de este producto con el código escaneado?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="qr-replace-remember"
              checked={skuReplaceRemember}
              onCheckedChange={(checked) => setSkuReplaceRemember(checked === true)}
            />
            <Label htmlFor="qr-replace-remember" className="text-sm cursor-pointer">
              Recordar mi decisión
            </Label>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCancelSkuReplace} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleConfirmSkuReplace} className="w-full sm:w-auto">
              Actualizar SKU
            </Button>
            <Button onClick={handleConfirmSkuReplaceAndSave} className="w-full sm:w-auto">
              Actualizar y guardar SKU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


