"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { storeProductService } from "@/services/store-product.service";
import { InventorySummaryResponse } from "@/types/inventory.types";
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
  X,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryReportsPage() {
  const { currentStore, hasPermission, activeLoginMode } = useAuth();
  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const [summary, setSummary] = useState<InventorySummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const pageSize = 12;
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const getStartOfCurrentMonth = () => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  };
  const getEndOfToday = () => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };
  const [fromDate, setFromDate] = useState<string>(getStartOfCurrentMonth);
  const [toDate, setToDate] = useState<string>(getEndOfToday);
  
  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [allStoreProducts, setAllStoreProducts] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");

  const loadStoreProducts = async (page = 1) => {
    const mode = activeLoginMode;
    if (mode === 'STORE' && !currentStore?.id) return;
    setIsLoadingProducts(true);
    try {
      const storeId = mode === 'STORE' ? currentStore?.id : undefined;
      if (!storeId) return;
      const response = await storeProductService.getInventoryReport({
        storeId,
        page,
        pageSize,
      });
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

  const loadSummary = async () => {
    const mode = activeLoginMode;
    if (mode === 'STORE' && !currentStore?.id) return;
    setIsLoading(true);
    setSummaryError(null);
    try {
      const dateRange = toUtcRange(formatDateForInput(fromDate), formatDateForInput(toDate));
      const storeId = mode === 'STORE' ? currentStore?.id : undefined;
      const data = await inventoryService.getMovementsSummary({
        storeId,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      });
      setSummary(data);
    } catch (error) {
      const message = (error as Error)?.message || "No se pudieron cargar las estadísticas del inventario.";
      setSummary(null);
      setSummaryError(message);
      console.error("Error loading summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewInventory) {
      loadSummary();
    }
  }, [currentStore?.id, canViewInventory, fromDate, toDate, activeLoginMode]);

  useEffect(() => {
    if (canViewInventory) {
      loadStoreProducts();
    }
  }, [currentStore?.id, canViewInventory, activeLoginMode]);

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toUtcRange = (from: string, to: string) => {
    const fromDate = new Date(`${from}T00:00:00`).toISOString();
    const toDate = new Date(`${to}T23:59:59.999`).toISOString();
    return { fromDate, toDate };
  };

  const handleFromDateChange = (value: string) => {
    if (!value) return;
    const utcRange = toUtcRange(value, formatDateForInput(toDate));
    setFromDate(utcRange.fromDate);
    const currentToDate = new Date(toDate);
    if (new Date(utcRange.fromDate) > currentToDate) {
      setToDate(utcRange.toDate);
    }
  };

  const handleToDateChange = (value: string) => {
    if (!value) return;
    const utcRange = toUtcRange(formatDateForInput(fromDate), value);
    if (new Date(utcRange.toDate) < new Date(fromDate)) {
      const newUtcRange = toUtcRange(value, value);
      setFromDate(newUtcRange.fromDate);
    }
    setToDate(utcRange.toDate);
  };

  const resetDateRange = () => {
    setFromDate(getStartOfCurrentMonth());
    setToDate(getEndOfToday());
  };

  // Filter products based on name and stock availability
  const filteredProducts = useMemo(() => {
    let filtered = allStoreProducts;

    // Filter by name
    if (nameFilter.trim()) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(nameFilter.toLowerCase())
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
    const names = new Set(allStoreProducts.map(p => p.name).filter(Boolean));
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

  if (!summary && isLoading) {
    return <div className="p-6 text-center">Cargando estadísticas...</div>;
  }

  // Totales por defecto si falla la carga
  const totals = summary?.totals || { incoming: 0, outgoing: 0, sales: 0, returns: 0, adjustmentsNet: 0 };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Reportes de Inventario</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Resumen del periodo: {summary?.period ? (
                `${new Date(summary.period.from).toLocaleDateString()} - ${new Date(summary.period.to).toLocaleDateString()}`
            ) : 'Mes en curso'}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadSummary} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Desde</p>
              <Input
                type="date"
                value={formatDateForInput(fromDate)}
                max={formatDateForInput(toDate)}
                onChange={(e) => handleFromDateChange(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Hasta</p>
              <Input
                type="date"
                value={formatDateForInput(toDate)}
                min={formatDateForInput(fromDate)}
                onChange={(e) => handleToDateChange(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={resetDateRange} disabled={isLoading}>
                Restablecer rango
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summaryError && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="text-sm text-foreground">{summaryError}</p>
              {!summary && (
                <p className="text-xs text-muted-foreground mt-1">
                  Aún puedes consultar la lista de productos y sus existencias individuales.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className={`grid gap-4 md:grid-cols-3 ${activeLoginMode === 'WAREHOUSE' ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{totals.incoming}</div>
            <p className="text-xs text-muted-foreground">Ingreso de productos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas / Mermas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-{totals.outgoing}</div>
            <p className="text-xs text-muted-foreground">Salidas manuales</p>
          </CardContent>
        </Card>

        {activeLoginMode !== 'WAREHOUSE' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">-{totals.sales}</div>
              <p className="text-xs text-muted-foreground">Salidas de producto por ventas</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{totals.adjustmentsNet > 0 ? '+' : ''}{totals.adjustmentsNet}</div>
            <p className="text-xs text-muted-foreground">Correcciones de inventario</p>
          </CardContent>
        </Card>

        {activeLoginMode !== 'WAREHOUSE' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
              <RotateCcw className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">-{totals.returns}</div>
              <p className="text-xs text-muted-foreground">Productos devueltos</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Listado de Productos */}
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
            <CardTitle className="text-lg sm:text-xl">Listado de Productos</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {activeLoginMode === 'WAREHOUSE' 
              ? 'Todos los productos del almacén con su stock actual.'
              : 'Todos los productos de la tienda con su stock actual.'
            }
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
            <div className="text-center py-6 sm:py-8 text-muted-foreground flex flex-col items-center">
              <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 mb-2 animate-spin" />
              <p className="text-sm sm:text-base">Cargando productos...</p>
            </div>
          ) : storeProducts.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground flex flex-col items-center">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-20" />
              <p className="text-sm sm:text-base">
                {activeLoginMode === 'WAREHOUSE' 
                  ? 'No hay productos en el almacén.'
                  : 'No hay productos en la tienda.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1 sm:space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground flex flex-col items-center">
                    <Package className="h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-20" />
                    <p className="text-sm sm:text-base">No se encontraron productos con los filtros aplicados.</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-medium leading-none">{product.name || 'Sin nombre'}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right">
                        <span className={`text-lg sm:text-2xl font-bold ${product.stock === 0 ? 'text-destructive' : product.stock < 10 ? 'text-warning' : 'text-success'}`}>
                          {product.stock || 0}
                        </span>
                        <p className="text-xs text-muted-foreground">Stock Actual</p>
                      </div>
                      <Badge variant={product.stock === 0 ? "destructive" : product.stock < 10 ? "secondary" : "default"} className="text-xs">
                        {product.stock === 0 ? 'SIN STOCK' : product.stock < 10 ? 'BAJO' : 'DISPONIBLE'}
                      </Badge>
                    </div>
                  </div>
                ))
                )}
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>Mostrando {filteredProducts.length} de {allStoreProducts.length} productos</span>
                    {hasActiveFilters && (
                      <span>Filtrados</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStoreProducts(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingProducts}
                      className="text-xs"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStoreProducts(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingProducts}
                      className="text-xs"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
