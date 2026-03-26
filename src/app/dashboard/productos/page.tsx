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
import { PacksTab } from '@/components/products/PacksTab';
import { ProductsTab } from '@/components/products/ProductsTab';
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

  const [activeTab, setActiveTab] = useState('productos');

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
    <div className="container mx-auto px-4 py-4 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-sm text-muted-foreground">{isWarehouseMode ? (currentWarehouse?.name ?? '') : (currentStore?.name ?? '')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="hidden md:block">
          <TabsList className="flex h-9">
            <TabsTrigger value="productos" className="text-sm h-8 px-3 py-1">Productos</TabsTrigger>
            <TabsTrigger value="packs" className="text-sm h-8 px-3 py-1">Packs</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="md:hidden">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="productos" className="text-sm h-8">Productos</TabsTrigger>
            <TabsTrigger value="packs" className="text-sm h-8">Packs</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="productos" className="space-y-4">
          <ProductsTab
            isWarehouseMode={isWarehouseMode}
            currentStore={currentStore}
            currentWarehouse={currentWarehouse}
            user={user}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            hasPermission={hasPermission}
          />
        </TabsContent>
        
        <TabsContent value="packs" className="space-y-4">
          <PacksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


