'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { storeProductService } from '@/services/store-product.service';
import { inventoryService } from '@/services/inventory.service';
import { storeService } from '@/services/store.service';
import { StoreProduct, CreateStoreProductRequest, StoreProductListItem, StoreProductDetail } from '@/types/store-product.types';
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
import { useAuth } from '@/contexts/auth-context';
import { ProductHistory } from '@/components/inventory/ProductHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const filteredNameSuggestions = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    if (!query) return [];
    return nameSuggestions.filter((item) => item.name?.toLowerCase().includes(query));
  }, [nameQuery, nameSuggestions]);

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
  const [detailForm, setDetailForm] = useState({
    name: '',
    description: '',
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

  const [formData, setFormData] = useState<StoreProductFormData>({
    name: '',
    description: '',
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
  const { user, currentStore, isAuthenticated, isAdmin, hasPermission } = useAuth();

  const { can } = usePermissions();

  const canViewProducts = can(PERMISSIONS.VIEW_PRODUCTS);
  const canViewProductPrices = can(PERMISSIONS.VIEW_PRODUCT_PRICES);
  const canViewProductCost = can(PERMISSIONS.VIEW_PRODUCT_COST);
  const canManageProducts = can(PERMISSIONS.MANAGE_PRODUCTS);
  const canManagePrices = can(PERMISSIONS.MANAGE_PRICES);
  const canDeleteProducts = can(PERMISSIONS.DELETE_PRODUCTS);

  const canCreateProducts = canViewProducts && canManageProducts;

  const canManageInventory = isAdmin || hasPermission?.("MANAGE_INVENTORY") || hasPermission?.("inventory.manage");

  const isForbiddenError = (error: unknown) => {
    const anyError = error as any;
    return anyError?.response?.status === 403;
  };

  useEffect(() => {
    if (currentStore?.id && !selectedStoreId) {
      setSelectedStoreId(currentStore.id);
      setStoreQuery(currentStore.name);
    }
  }, [currentStore?.id, currentStore?.name, selectedStoreId]);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const stores = await storeService.getStoresLookup();
        setStoresLookup(Array.isArray(stores) ? stores : []);
      } catch (error) {
        console.error('Error loading stores lookup:', error);
      }
    };

    loadStores();
  }, []);

  const fetchStoreProducts = useCallback(async (targetPage = 1) => {
    const storeId = selectedStoreId || currentStore?.id;
    if (!storeId) {
      console.log('❌ No hay storeId seleccionado, abortando fetchStoreProducts');
      return;
    }

    if (!canViewProducts) {
      setStoreProducts([]);
      return;
    }
    console.log('🚀 Iniciando fetchStoreProducts para tienda:', storeId);
    
    try {
      setLoading(true);
<<<<<<< HEAD
      const response = await storeProductService.getStoreProducts(currentStore.id, 1, 1000, searchTerm);
      console.log('📦 Datos recibidos de storeProductService:', response);
      
      // El backend devuelve {data: Array(1), total: 1, page: 1, limit: 100, totalPages: 1}
      // Necesitamos acceder a response.data, no response directamente
      const productsArray = Array.isArray(response?.data) ? response.data : [];
      console.log('📊 Array procesado:', productsArray.length, 'productos');
      
      setStoreProducts(productsArray);
      setFilteredStoreProducts(productsArray);
=======
      const response = await storeProductService.getStoreProductsList({
        storeId,
        page: targetPage,
        pageSize: PAGE_SIZE,
        name: nameFilter.trim() || undefined,
        inStock: hideOutOfStock ? true : undefined,
      });

      setStoreProducts(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setPage(response.page || targetPage);
>>>>>>> 2c30ab8bcaac1177bef5b5c5f12dab6a6c39fda6
    } catch (error) {
      console.error('❌ Error fetching store products:', error);
      setStoreProducts([]);
      setTotal(0);
      setTotalPages(1);
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
      console.log('🏁 fetchStoreProducts finalizado');
    }
  }, [selectedStoreId, currentStore?.id, nameFilter, hideOutOfStock, toast, canViewProducts]);

  const fetchStoreProductsRef = useRef(fetchStoreProducts);

  useEffect(() => {
    fetchStoreProductsRef.current = fetchStoreProducts;
  }, [fetchStoreProducts]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const filtersKey = useMemo(() => {
    return [nameFilter, hideOutOfStock].join('|');
  }, [nameFilter, hideOutOfStock]);

  const clearFilters = () => {
    setNameFilter('');
    setNameQuery('');
    setShowNameSuggestions(false);
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
    if (!isAuthenticated || !activeStoreId) {
      return;
    }

    if (lastStoreIdRef.current === activeStoreId && hasFetchedInitialRef.current) {
      return;
    }

    lastStoreIdRef.current = activeStoreId;
    hasFetchedInitialRef.current = true;
    filtersInitializedRef.current = true;
    fetchStoreProductsRef.current?.(1);
  }, [isAuthenticated, activeStoreId]);

  const loadProductLookup = useCallback(async () => {
    try {
      setNameLookupLoading(true);
      const lookup = await storeProductService.getCatalogProductsLookup('');
      setNameSuggestions(Array.isArray(lookup) ? lookup : []);
    } catch (error) {
      console.error('Error loading product name lookup:', error);
      setNameSuggestions([]);
    } finally {
      setNameLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductLookup();
  }, [loadProductLookup]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!nameInputWrapperRef.current) return;
      if (!nameInputWrapperRef.current.contains(event.target as Node)) {
        setShowNameSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (nameFilter.trim()) {
      setPage(1);
      fetchStoreProductsRef.current?.(1);
    }
  }, [nameFilter]);

  useEffect(() => {
    setPage(1);
    fetchStoreProductsRef.current?.(1);
  }, [hideOutOfStock]);

  // Debug: verificar estado actual
  useEffect(() => {
    console.log('🔍 Estado de productos:', {
      loading,
      storeProductsCount: storeProducts.length,
      total,
      page,
      totalPages,
      isAuthenticated,
      currentStoreId: currentStore?.id,
      selectedStoreId,
      nameFilter
    });
  }, [loading, storeProducts.length, total, page, totalPages, isAuthenticated, currentStore?.id, selectedStoreId, nameFilter]);

  const visibleProducts = useMemo(() => {
    return storeProducts;
  }, [storeProducts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'buyCost' || name === 'basePrice' || name === 'price' || name === 'stock' || name === 'stockThreshold' ? Number(value) : value,
    }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;

    if (!isEditing) {
      if (!canCreateProducts) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para crear productos.',
        });
        return;
      }
    } else {
      if (!canManageProducts && !canManagePrices) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para editar productos.',
        });
        return;
      }
    }

    // Validar que no se reduzca el stock en edición
    if (isEditing && originalStock !== null && formData.stock < originalStock) {
      toast({
        title: "Error",
        description: "No se puede reducir el stock desde aquí. Use la sección de Inventario.",
        variant: "destructive"
      });
      return;
    }

    try {
      let productData: CreateStoreProductRequest;

      if (isEditing && currentStoreProduct) {
        // Edición: enviar solo los campos que se van a actualizar
        let updateData: any;

        // Reglas actuales:
        // - description nunca se envía
        // - MANAGE_PRODUCTS: solo permite editar name
        // - MANAGE_PRICES: permite editar price
        // - buyCost/basePrice requieren MANAGE_PRICES + VIEW_PRODUCT_COST
        updateData = {};

        if (canManageProducts) {
          updateData.name = formData.name;
          updateData.description = formData.description;
          updateData.stockThreshold = formData.stockThreshold;
        }

        if (canManagePrices) {
          updateData.price = formData.price;

          updateData.basePrice = formData.basePrice;

          if (canViewProductCost) {
            updateData.buyCost = formData.buyCost;
          }
        }

        // Stock/threshold se mantienen bajo permisos de inventario (si aplica)
        if (canManageInventory) {
          updateData.stock = formData.stock;
        }

        console.log('🔍 IDs para actualizar:', {
          storeProductId: currentStoreProduct.id,
          productId: currentStoreProduct.productId,
          endpointId: currentStoreProduct.id
        });
        console.log('📦 Datos de actualización:', updateData);
        await storeProductService.updateStoreProduct(currentStoreProduct.id, updateData);

        toast({
          title: 'Producto actualizado',
          description: 'El producto se ha actualizado correctamente',
        });
      } else {
        // Creación: siempre crear producto nuevo
        // Reglas actuales:
        // - VIEW_PRODUCTS + MANAGE_PRODUCTS para crear y setear datos básicos
        // - MANAGE_PRICES para setear price/basePrice
        // - MANAGE_PRICES + VIEW_PRODUCT_COST para setear buyCost
        if (!canCreateProducts) {
          toast({
            title: 'Sin permisos',
            description: 'No tienes permisos para crear productos.',
          });
          return;
        }
        productData = {
          createNewProduct: true,
          name: formData.name,
          description: formData.description,
          storeId: currentStore.id,
          stockThreshold: formData.stockThreshold,
          stock: formData.stock,
          ...(canManagePrices ? { price: formData.price } : {}),
          ...(canManagePrices ? { basePrice: formData.basePrice } : {}),
          ...(canManagePrices && canViewProductCost ? { buyCost: formData.buyCost } : {}),
        } as CreateStoreProductRequest;

        const response = await storeProductService.createStoreProduct(productData);
        console.log('📦 Producto creado (respuesta backend):', response);

        // Manejar si el backend devuelve un array o un objeto
        const createdProduct = Array.isArray(response) ? response[0] : response;

        toast({
          title: 'Producto creado',
          description: 'El producto se ha creado correctamente',
        });

        // Refrescar el lookup para que el nuevo producto aparezca en las sugerencias
        await loadProductLookup();
      }

      await fetchStoreProducts();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      if (isForbiddenError(error)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para realizar esta acción.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo guardar el producto',
          variant: 'destructive',
        });
      }
    }
  }, [currentStore, isEditing, currentStoreProduct, formData, fetchStoreProducts, toast, loadProductLookup, canCreateProducts, canManageProducts, canManagePrices, canViewProductCost, canManageInventory]);

  const loadProductDetail = useCallback(async (productId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const formatValue = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toString() : String(value);
      };
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
      });
    } catch (error) {
      console.error('Error loading product detail:', error);
      setDetailError('No se pudo cargar el detalle del producto.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openProductDetail = (productId: string) => {
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
    setDetailForm({ name: '', description: '', price: '', buyCost: '', basePrice: '', stockThreshold: '' });
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
    setCurrentStoreProduct(null);
    setOriginalStock(null);
    setFormData({
      name: '',
      description: '',
      buyCost: 0,
      basePrice: 0,
      price: 0,
      stock: 0,
      stockThreshold: 1,
    });
    setIsEditing(false);
    setIsModalOpen(true);
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
    });
    setCurrentStoreProduct(null);
    setOriginalStock(null);
    setIsEditing(false);
  };

  if (!isAuthenticated || !currentStore) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">{currentStore.name}</p>
        </div>
        {canCreateProducts && (
          <Button onClick={openNewProductModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          
          <div className="space-y-2">
            <Label>Producto</Label>
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
                className="pl-8"
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
        </div>
      </div>

      <ActiveFilters 
        hasActiveFilters={!!(nameFilter || !hideOutOfStock)}
        onClearFilters={clearFilters}
      />

      {/* Add click outside handler */}
      <div 
        className="fixed inset-0 z-10" 
        style={{ display: showNameSuggestions ? 'block' : 'none' }}
        onClick={() => setShowNameSuggestions(false)}
      />

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <span>
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
                ? "No hay productos con stock en esta tienda"
                : "No hay productos en esta tienda"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleProducts.map((storeProduct) => (
              <Card
                key={storeProduct.id}
                className={`h-full flex flex-col py-5 transition hover:border-primary ${canManageProducts ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                onClick={() => openProductDetail(storeProduct.id)}
              >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{storeProduct.name}</CardTitle>
                </div>
                <div className="space-y-1">
                  {(canViewProductPrices || canManagePrices) && typeof storeProduct.price === 'number' && (
                    <p className="text-xl font-bold text-primary">
                      S/ {storeProduct.price.toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`font-medium ${
                      storeProduct.stock <= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {storeProduct.stock} unidades
                    </span>
                    {storeProduct.stock <= 0 && (
                      <span className="text-red-600 text-xs">
                        ⚠️ Stock bajo
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">                
                {canViewProductCost && (storeProduct.buyCost !== undefined) && (storeProduct.price !== undefined) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Costo: S/ {(storeProduct.buyCost || 0).toFixed(2)}</p>
                    <p>Ganancia: S/ {((storeProduct.price || 0) - (storeProduct.buyCost || 0)).toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const next = page - 1;
                  if (next < 1) return;
                  setPage(next);
                  fetchStoreProducts(next);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const next = page + 1;
                  if (next > totalPages) return;
                  setPage(next);
                  fetchStoreProducts(next);
                }}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar producto */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <div 
            className="bg-background rounded-lg p-6 w-full max-w-md border shadow-lg relative"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Campos visibles para todos */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={!canCreateProducts}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                    disabled={!canCreateProducts}
                  />
                </div>

                {/* Campos de precios: solo editables con MANAGE_PRICES. VIEW_PRODUCT_PRICES NO es requerido para crear/editar precios aqu. */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Precio de venta <span className="text-destructive">*</span>
                  </label>
                  <>
                    <Input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required={canManagePrices}
                      disabled={!canManagePrices}
                    />
                    {!canManagePrices && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No tienes permisos para establecer precios.
                      </p>
                    )}
                  </>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Precio base
                  </label>
                  <Input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    disabled={!canManagePrices}
                  />
                </div>

                {/* Costo: solo si puede verlo y adems tiene MANAGE_PRICES */}
                {canViewProductCost && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Costo de compra
                    </label>
                    <Input
                      type="number"
                      name="buyCost"
                      value={formData.buyCost}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      disabled={!canManagePrices}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stock <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min={isEditing && originalStock !== null ? originalStock : 0}
                    placeholder="0"
                    required
                    disabled={isEditing ? !canManageInventory : !canCreateProducts}
                  />
                  {isEditing && originalStock !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo se permite aumentar el stock. Para reducirlo, use la seccin de Inventario.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Alerta de Stock
                  </label>
                  <Input
                    type="number"
                    name="stockThreshold"
                    value={formData.stockThreshold}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="1"
                    required
                    disabled={!canCreateProducts}
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3 border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={detailModalOpen} onOpenChange={(open) => {
        if (!open) closeProductDetail();
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del producto</DialogTitle>
            <DialogDescription>
              Revisa la información del producto en la tienda y realiza ajustes si es necesario.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detailError ? (
            <p className="text-sm text-destructive">{detailError}</p>
          ) : productDetail ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={detailForm.name}
                    onChange={(e) => handleDetailFormChange('name', e.target.value)}
                    disabled={isUpdatingDetail || !canManageProducts}
                  />
                </div>
                <div>
                  <Label>Precio (venta)</Label>                  
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
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <Label>Costo</Label>
                  {canViewProductCost ? (
                    <Input
                      type="number"
                      value={detailForm.buyCost}
                      onChange={(e) => handleDetailFormChange('buyCost', e.target.value)}
                      disabled={isUpdatingDetail || !canManagePrices}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <Label>Precio base</Label>
                  {canViewProductPrices ? (
                    <Input
                      type="number"
                      value={detailForm.basePrice}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!isValidNumberInputValue(next)) return;
                        handleDetailFormChange('basePrice', next);
                      }}
                      disabled={isUpdatingDetail || !canManagePrices}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <textarea
                    value={detailForm.description}
                    onChange={(e) => handleDetailFormChange('description', e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isUpdatingDetail || !canManageProducts}
                  />
                </div>
                <div>
                  <Label>Alerta de stock</Label>
                  <Input
                    type="number"
                    value={detailForm.stockThreshold}
                    onChange={(e) => handleDetailFormChange('stockThreshold', e.target.value)}
                    disabled={isUpdatingDetail || !canManageProducts}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border p-4 text-sm md:col-span-2">
                  <p className="font-semibold mb-1">Información en tienda</p>
                  <p>Tienda: {productDetail.store?.name ?? '—'}</p>
                  <p>Dirección: {productDetail.store?.address ?? '—'}</p>
                  <p>Teléfono: {productDetail.store?.phone ?? '—'}</p>
                  <p>Stock actual: {productDetail.stock}</p>
                  <p>Responsable: {productDetail.user?.name ?? '—'}</p>
                </div>
                <div className="rounded-md border p-4 text-sm space-y-3 flex flex-col h-full">
                  <p className="font-semibold">Acciones</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUpdateDetail}
                    disabled={isUpdatingDetail || (!canManageProducts && !canManagePrices)}
                  >
                    {isUpdatingDetail ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  {canDeleteProducts && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStoreProductDetail();
                      }}
                      disabled={isDeletingStoreProduct}
                    >
                      {isDeletingStoreProduct ? 'Eliminando...' : 'Eliminar de esta tienda'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">Eliminar del catálogo</p>
                    <p className="text-xs text-muted-foreground">
                      Esta acción eliminará el producto de todas las tiendas. Se recomienda dejar el stock en 0 antes de continuar.
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
                    >
                      Eliminar del catálogo
                    </Button>
                  )}
                </div>

                {showCatalogDeleteForm && (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Correo de confirmación</Label>
                        <Input
                          type="email"
                          value={catalogDeleteCredentials.email}
                          onChange={(e) => setCatalogDeleteCredentials((prev) => ({ ...prev, email: e.target.value }))}
                          disabled={isDeletingCatalogProduct}
                        />
                      </div>
                      <div>
                        <Label>Contraseña</Label>
                        <Input
                          type="password"
                          value={catalogDeleteCredentials.password}
                          onChange={(e) => setCatalogDeleteCredentials((prev) => ({ ...prev, password: e.target.value }))}
                          disabled={isDeletingCatalogProduct}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCatalogDeleteForm(false);
                          setCatalogDeleteCredentials({ email: '', password: '' });
                        }}
                        disabled={isDeletingCatalogProduct}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCatalogProductDetail();
                        }}
                        disabled={isDeletingCatalogProduct}
                      >
                        {isDeletingCatalogProduct ? 'Eliminando del catálogo...' : 'Confirmar eliminación'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeProductDetail} disabled={isUpdatingDetail || isDeletingStoreProduct || isDeletingCatalogProduct}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


