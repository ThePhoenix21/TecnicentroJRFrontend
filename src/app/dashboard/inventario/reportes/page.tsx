"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { storeProductService } from "@/services/store-product.service";
import { InventoryStats } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  List,
  ChevronLeft,
  ChevronRight
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

  const loadStoreProducts = async (page = 1) => {
    if (!currentStore?.id) return;
    setIsLoadingProducts(true);
    try {
      const response = await storeProductService.getStoreProducts(currentStore.id, page, pageSize);
      setStoreProducts(response.data || []);
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
                {storeProducts.map((product) => (
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
                ))}
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {storeProducts.length} de {totalProducts} productos
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
