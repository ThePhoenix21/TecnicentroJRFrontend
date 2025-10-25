'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { productService } from '@/services/product.service';
import { Product } from '@/types/product.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, X, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';

interface ProductFormData {
  name: string;
  description: string;
  buycost: number;        // ✅ Campo obligatorio de la API
  price: number;          // ✅ Campo obligatorio de la API (calculado)
  stock: number;          // ❌ Campo opcional de la API (default: 0)
  stockTreshold: number;  // ❌ Campo opcional de la API (default: 1)
  // Campos adicionales para lógica de cálculo (no se envían a la API)
  profitType: 'fixed' | 'percentage';
  profitValue: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    buycost: 0,
    price: 0,           // ✅ Campo obligatorio (se calcula automáticamente)
    stock: 0,           // ❌ Campo opcional (default: 0)
    stockTreshold: 1,   // ❌ Campo opcional (default: 1)
    profitType: 'fixed', // Campo adicional para lógica de cálculo
    profitValue: 0,     // Campo adicional para lógica de cálculo
  });

  // Inicializar hooks
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, isAdmin } = useAuth();
  const calculateFinalPrice = (buycost: number, profitType: 'fixed' | 'percentage', profitValue: number): number => {
    if (profitType === 'fixed') {
      return buycost + profitValue;
    } else {
      return buycost + (buycost * profitValue / 100);
    }
  };

  // Obtener el precio final calculado
  const finalPrice = calculateFinalPrice(formData.buycost, formData.profitType, formData.profitValue);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts(1, 100, searchTerm);
      setProducts(data.data || []);
      setFilteredProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProducts();
  }, [isAuthenticated, router, fetchProducts]);

  // Filtro local para búsqueda en tiempo real
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof product.description === 'string' && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        fetchProducts();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, isAuthenticated, fetchProducts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: name === 'buycost' || name === 'profitValue' || name === 'stock' || name === 'stockTreshold' ? Number(value) : value,
      };

      // Si cambió el tipo de ganancia, recalcular el precio final
      if (name === 'profitType') {
        updatedData.profitType = value as 'fixed' | 'percentage';
      }

      return updatedData;
    });
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ Preparar datos para enviar (solo campos válidos para la API)
      const productData = {
        name: formData.name,
        description: formData.description,
        price: finalPrice, // ✅ Usar el precio calculado
        buycost: formData.buycost,
        stock: formData.stock,
        stockTreshold: formData.stockTreshold,
      };

      if (isEditing && currentProduct) {
        await productService.updateProduct(currentProduct.id, productData);
        toast({
          title: 'Éxito',
          description: 'Producto actualizado correctamente',
        });
      } else {
        await productService.createProduct(productData);
        toast({
          title: 'Éxito',
          description: 'Producto creado correctamente',
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar el producto';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [formData, finalPrice, isEditing, currentProduct, toast, fetchProducts]);

  const handleEdit = useCallback((product: Product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      description: typeof product.description === 'string' ? product.description : '',
      buycost: product.buycost,
      price: product.price,           // ✅ Usar precio existente del producto
      stock: product.stock,
      stockTreshold: product.stockTreshold || 1,
      profitType: 'fixed',           // ✅ Valor por defecto para cálculo
      profitValue: product.price - product.buycost, // ✅ Calcular ganancia fija
    });
    setIsEditing(true);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await productService.deleteProduct(id);
        toast({
          title: 'Éxito',
          description: 'Producto eliminado correctamente',
        });
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el producto',
          variant: 'destructive',
        });
      }
    }
  }, [toast, fetchProducts]);

  const openNewProductModal = () => {
    setCurrentProduct(null);
    setFormData({
      name: '',
      description: '',
      buycost: 0,
      price: 0,
      stock: 0,
      stockTreshold: 1,
      profitType: 'fixed',
      profitValue: 0,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  if (!isAuthenticated) {
    return null; // O un componente de carga
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Productos</h1>
        {isAdmin && (
          <Button onClick={openNewProductModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por ID, nombre, SKU o categoría..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                fetchProducts();
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Info className="h-3.5 w-3.5" />
          <span>
            Mostrando {filteredProducts.length} de {products.length} productos
            {searchTerm.trim() && ` (filtrados por "${searchTerm}")`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm.trim()
              ? `No se encontraron productos que coincidan con "${searchTerm}"`
              : "No se encontraron productos"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{product.name}</CardTitle>
                  {isAdmin && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">
                  S/{product.price.toFixed(2)}
                  <span className="ml-2 text-sm text-green-500">
                    {product.stock} en stock
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-600 mb-4">
                  {typeof product.description === 'string' && product.description !== null
                    ? product.description
                    : 'Sin descripción'}
                </p>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
                <span className="sr-only">Cerrar</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Costo de compra <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    name="buycost"
                    value={formData.buycost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Sección de Calculadora de Precios */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium">Calculadora de Precios</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tipo de ganancia
                      </label>
                      <select
                        name="profitType"
                        value={formData.profitType}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      >
                        <option value="fixed">Monto fijo (S/)</option>
                        <option value="percentage">Porcentaje (%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {formData.profitType === 'fixed' ? 'Ganancia (S/)' : 'Ganancia (%)'}
                      </label>
                      <Input
                        type="number"
                        name="profitValue"
                        value={formData.profitValue}
                        onChange={handleInputChange}
                        min="0"
                        step={formData.profitType === 'fixed' ? "0.01" : "1"}
                        placeholder={formData.profitType === 'fixed' ? "5.00" : "20"}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-background rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Precio final calculado:</span>
                      <span className="text-lg font-bold text-primary">
                        S/ {finalPrice.toFixed(2)}
                      </span>
                    </div>
                    {formData.profitType === 'percentage' && formData.buycost > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        ({formData.profitValue}% de S/ {formData.buycost.toFixed(2)})
                      </div>
                    )}
                  </div>
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
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Alerta de Stock
                  </label>
                  <Input
                    type="number"
                    name="stockTreshold"
                    value={formData.stockTreshold}
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
