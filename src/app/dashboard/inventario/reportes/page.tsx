"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { storeProductService } from "@/services/store-product.service";
import { InventoryStats } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActiveFilters } from "@/components/ui/active-filters";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryReportsPage() {
  const { currentStore, hasPermission } = useAuth();
  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const pageSize = 12;
  
  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [allStoreProducts, setAllStoreProducts] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");

  const loadStoreProducts = async (page = 1) => {
    if (!currentStore?.id) return;
    setIsLoadingProducts(true);
    try {
      const response = await storeProductService.getStoreProducts(currentStore.id, page, pageSize * 10); // Load more for filtering
      const products = response.data || [];
      setAllStoreProducts(products);
      setStoreProducts(products);
      setTotalPages(response.totalPages || 0);
      setTotalProducts(response.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading store products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadStats = async () => {
    if (!currentStore?.id) return;
    setIsLoading(true);
    try {
      const data = await inventoryService.getDashboardStats(currentStore.id);
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewInventory) {
      loadStats();
      loadStoreProducts();
    }
  }, [currentStore?.id, canViewInventory]);

  // Filter products based on name and stock availability
  const filteredProducts = useMemo(() => {
    let filtered = allStoreProducts;

    // Filter by name
    if (nameFilter.trim()) {
      filtered = filtered.filter(product => 
        product.product?.name?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Filter by stock availability
    if (stockFilter !== "all") {
      filtered = filtered.filter(product => {
        if (stockFilter === "available") {
          return product.stock > 0;
        } else if (stockFilter === "out_of_stock") {
          return product.stock === 0;
        }
        return true;
      });
    }

    return filtered;
  }, [allStoreProducts, nameFilter, stockFilter]);

  // Get unique product names for suggestions
  const nameSuggestions = useMemo(() => {
    const names = new Set(allStoreProducts.map(p => p.product?.name).filter(Boolean));
    return Array.from(names).filter(name => 
      name.toLowerCase().includes(searchInput.toLowerCase())
    ).slice(0, 5);
  }, [allStoreProducts, searchInput]);

  // Check if there are active filters
  const hasActiveFilters = nameFilter.trim() !== "" || stockFilter !== "all";

  // Clear all filters
  const clearFilters = () => {
    setNameFilter("");
    setSearchInput("");
    setStockFilter("all");
    setShowNameSuggestions(false);
  };

  // Handle name selection from suggestions
  const handleNameSelect = (name: string) => {
    setNameFilter(name);
    setSearchInput(name);
    setShowNameSuggestions(false);
  };

  // Handle Enter key in name input
  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setNameFilter(searchInput);
      setShowNameSuggestions(false);
    }
  };

  if (!canViewInventory) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Reportes de Inventario</h1>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para ver los reportes de inventario.
        </p>
      </div>
    );
  }

  if (!stats && isLoading) {
    return <div className="p-6 text-center">Cargando estadísticas...</div>;
  }

  // Valores por defecto si falla la carga o es null
  const s = stats?.stats || { incoming: 0, outgoing: 0, sales: 0, adjustments: 0 };
  const criticalProducts = stats?.criticalProducts || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Inventario</h1>
          <p className="text-muted-foreground">
            Resumen del periodo: {stats?.period ? (
                `${new Date(stats.period.start).toLocaleDateString()} - ${new Date(stats.period.end).toLocaleDateString()}`
            ) : 'Actual'}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{s.incoming}</div>
            <p className="text-xs text-muted-foreground">Productos ingresados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas / Mermas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{s.outgoing}</div>
            <p className="text-xs text-muted-foreground">Salidas manuales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">-{s.sales}</div>
            <p className="text-xs text-muted-foreground">Salidas por venta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{s.adjustments > 0 ? '+' : ''}{s.adjustments}</div>
            <p className="text-xs text-muted-foreground">Correcciones de inventario</p>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Productos */}
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-blue-500" />
            <CardTitle>Listado de Productos</CardTitle>
          </div>
          <CardDescription>
            Todos los productos de la tienda con su stock actual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowNameSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowNameSuggestions(searchInput.length > 0)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  onKeyDown={handleNameKeyPress}
                  className="pl-10"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchInput("");
                      setNameFilter("");
                    }}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                
                {/* Name suggestions dropdown */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {nameSuggestions.map((name, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => handleNameSelect(name)}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponibles</SelectItem>
                  <SelectItem value="out_of_stock">Sin stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <ActiveFilters 
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </div>

          {isLoadingProducts ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <RefreshCw className="h-10 w-10 mb-2 animate-spin" />
              <p>Cargando productos...</p>
            </div>
          ) : storeProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <Package className="h-10 w-10 mb-2 opacity-20" />
              <p>No hay productos en la tienda.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                    <Package className="h-10 w-10 mb-2 opacity-20" />
                    <p>No se encontraron productos con los filtros aplicados.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium leading-none">{product.product?.name || 'Sin nombre'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {product.stock || 0}
                        </span>
                        <p className="text-xs text-muted-foreground">Stock Actual</p>
                      </div>
                      <Badge variant={product.stock === 0 ? "destructive" : product.stock < 10 ? "secondary" : "default"}>
                        {product.stock === 0 ? 'SIN STOCK' : product.stock < 10 ? 'BAJO' : 'DISPONIBLE'}
                      </Badge>
                    </div>
                  </div>
                ))
                )}
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Mostrando {filteredProducts.length} de {allStoreProducts.length} productos</span>
                    {hasActiveFilters && (
                      <span>Filtrados</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStoreProducts(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingProducts}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStoreProducts(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingProducts}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
