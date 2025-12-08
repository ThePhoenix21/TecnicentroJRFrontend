'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { storeProductService } from '@/services/store-product.service';
import { inventoryService } from '@/services/inventory.service';
import { StoreProduct, Product, CreateStoreProductRequest } from '@/types/store-product.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, X, Info, Package, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ProductHistory } from '@/components/inventory/ProductHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [filteredStoreProducts, setFilteredStoreProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStoreProduct, setCurrentStoreProduct] = useState<StoreProduct | null>(null);
  const [originalStock, setOriginalStock] = useState<number | null>(null); // Nuevo estado
  const [formData, setFormData] = useState<StoreProductFormData>({
    name: '',
    description: '',
    buyCost: 0,
    basePrice: 0,
    price: 0,
    stock: 0,
    stockThreshold: 1,
  });

  // Inicializar hooks
  const router = useRouter();
  const { toast } = useToast();
  const { user, currentStore, isAuthenticated, isAdmin, hasPermission } = useAuth();

  const canViewProducts = isAdmin || hasPermission?.("VIEW_PRODUCTS") || hasPermission?.("MANAGE_PRODUCTS");
  const canManageProducts = isAdmin || hasPermission?.("MANAGE_PRODUCTS");
  const canManagePrices = isAdmin || hasPermission?.("MANAGE_PRICES");

  const fetchStoreProducts = useCallback(async () => {
    if (!currentStore) {
      console.log('❌ No hay currentStore, abortando fetchStoreProducts');
      return;
    }
    
    console.log('🚀 Iniciando fetchStoreProducts para tienda:', currentStore.id);
    
    try {
      setLoading(true);
      const response = await storeProductService.getStoreProducts(currentStore.id, 1, 100, searchTerm);
      console.log('📦 Datos recibidos de storeProductService:', response);
      
      // El backend devuelve {data: Array(1), total: 1, page: 1, limit: 100, totalPages: 1}
      // Necesitamos acceder a response.data, no response directamente
      const productsArray = Array.isArray(response?.data) ? response.data : [];
      console.log('📊 Array procesado:', productsArray.length, 'productos');
      
      setStoreProducts(productsArray);
      setFilteredStoreProducts(productsArray);
    } catch (error) {
      console.error('❌ Error fetching store products:', error);
      setStoreProducts([]);
      setFilteredStoreProducts([]);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('🏁 fetchStoreProducts finalizado');
    }
  }, [currentStore?.id, searchTerm, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (currentStore) {
      fetchStoreProducts();
    }
  }, [isAuthenticated, router, currentStore?.id]);

  useEffect(() => {
    let filtered = storeProducts;
    
    // Aplicar filtro de búsqueda
    if (searchTerm.trim()) {
      filtered = filtered.filter((storeProduct) =>
        storeProduct.product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (storeProduct.product.description && storeProduct.product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Aplicar filtro de stock
    if (hideOutOfStock) {
      filtered = filtered.filter((storeProduct) => storeProduct.stock > 0);
    }
    
    setFilteredStoreProducts(filtered);
  }, [searchTerm, storeProducts, hideOutOfStock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && currentStore) {
        fetchStoreProducts();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, isAuthenticated, currentStore?.id]);

  // Debug: verificar estado actual
  useEffect(() => {
    console.log('🔍 Estado de productos:', {
      loading,
      storeProductsCount: storeProducts.length,
      filteredStoreProductsCount: filteredStoreProducts.length,
      isAuthenticated,
      currentStoreId: currentStore?.id,
      searchTerm
    });
  }, [loading, storeProducts.length, filteredStoreProducts.length, isAuthenticated, currentStore?.id, searchTerm]);

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
        
        if (isAdmin) {
          // ADMIN puede editar todo
          updateData = {
            name: formData.name,
            description: formData.description,
            buyCost: formData.buyCost,
            basePrice: formData.basePrice,
            price: formData.price,
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          };
        } else {
          // USER: control fino por permisos
          updateData = {
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          };

          // Solo usuarios con MANAGE_PRICES pueden modificar el precio
          if (canManagePrices) {
            updateData.price = formData.price;
          }
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
        if (isAdmin) {
          // ADMIN crea con todos los campos
          productData = {
            createNewProduct: true,
            name: formData.name,
            description: formData.description,
            buyCost: formData.buyCost,
            basePrice: formData.basePrice,
            storeId: currentStore.id,
            price: formData.price,
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          };
        } else {
          // USER crea con campos limitados; precio solo si tiene MANAGE_PRICES
          productData = {
            createNewProduct: true,
            name: formData.name,
            description: formData.description,
            storeId: currentStore.id,
            stock: formData.stock,
            stockThreshold: formData.stockThreshold,
          } as CreateStoreProductRequest;

          if (canManagePrices) {
            (productData as any).price = formData.price;
          }
        }

        const response = await storeProductService.createStoreProduct(productData);
        console.log('📦 Producto creado (respuesta backend):', response);

        // Manejar si el backend devuelve un array o un objeto
        const createdProduct = Array.isArray(response) ? response[0] : response;

        toast({
          title: 'Producto creado',
          description: 'El producto se ha creado correctamente',
        });
      }

      await fetchStoreProducts();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el producto',
        variant: 'destructive',
      });
    }
  }, [currentStore, isEditing, currentStoreProduct, formData, isAdmin, fetchStoreProducts, toast]);

  const handleEdit = useCallback((storeProduct: StoreProduct) => {
    setCurrentStoreProduct(storeProduct);
    setOriginalStock(storeProduct.stock); // Guardar stock original
    setFormData({
      name: storeProduct.product.name,
      description: storeProduct.product.description || '',
      buyCost: storeProduct.product.buyCost || 0,
      basePrice: storeProduct.product.basePrice || 0,
      price: storeProduct.price,
      stock: storeProduct.stock,
      stockThreshold: storeProduct.stockThreshold,
    });
    setIsEditing(true);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto de la tienda?')) {
      try {
        await storeProductService.deleteStoreProduct(id);
        toast({
          title: 'Éxito',
          description: 'Producto eliminado correctamente',
        });
        fetchStoreProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto',
          variant: 'destructive',
        });
      }
    }
  }, [toast, fetchStoreProducts]);

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
        {canManageProducts && (
          <Button onClick={openNewProductModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>
              Mostrando {filteredStoreProducts.length} de {storeProducts.length} productos
              {searchTerm.trim() && ` (filtrados por "${searchTerm}")`}
              {hideOutOfStock && ' (sin stock oculto)'}
            </span>
          </div>
          
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
      ) : filteredStoreProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">
            {searchTerm.trim()
              ? `No se encontraron productos que coincidan con "${searchTerm}"`
              : hideOutOfStock
                ? "No hay productos con stock en esta tienda"
                : "No hay productos en esta tienda"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStoreProducts.map((storeProduct) => (
            <Card key={storeProduct.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{storeProduct.product.name}</CardTitle>
                  {canManageProducts && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(storeProduct)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    {/*desctivado temporalmente
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(storeProduct.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    */}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">
                    S/ {storeProduct.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`font-medium ${
                      storeProduct.stock <= storeProduct.stockThreshold 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {storeProduct.stock} unidades
                    </span>
                    {storeProduct.stock <= storeProduct.stockThreshold && (
                      <span className="text-red-600 text-xs">
                        ⚠️ Stock bajo
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">                
                {isAdmin && storeProduct.product.buyCost && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Costo: S/ {storeProduct.product.buyCost.toFixed(2)}</p>
                    <p>Ganancia: S/ {(storeProduct.price - storeProduct.product.buyCost).toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
                    disabled={isEditing && !isAdmin} // Solo ADMIN puede editar nombre en edición
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
                    disabled={isEditing && !isAdmin} // Solo ADMIN puede editar descripción en edición
                  />
                </div>

                {/* Campos solo para ADMIN */}
                {isAdmin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Costo de compra <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        name="buyCost"
                        value={formData.buyCost}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        disabled={isEditing && !isAdmin} // Solo ADMIN puede editar costo
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Precio base <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        name="basePrice"
                        value={formData.basePrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        disabled={isEditing && !isAdmin} // Solo ADMIN puede editar precio base
                      />
                    </div>
                  </>
                )}

                {/* Campos visibles para todos */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Precio de venta <span className="text-destructive">*</span>
                  </label>
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
                      No tienes permisos para modificar precios.
                    </p>
                  )}
                </div>

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
                  />
                  {isEditing && originalStock !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo se permite aumentar el stock. Para reducirlo, use la sección de Inventario.
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
    </div>
  );
}
