"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { InventoryStats } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  Package, 
  TrendingUp,
  RefreshCw,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryReportsPage() {
  const { currentStore, hasPermission } = useAuth();
  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      {/* Critical Products */}
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle>Productos Críticos</CardTitle>
          </div>
          <CardDescription>
            Productos con stock por debajo o igual al umbral mínimo definido.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {criticalProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                    <Package className="h-10 w-10 mb-2 opacity-20" />
                    <p>Todo en orden. No hay productos en estado crítico.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {criticalProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="space-y-1">
                                <p className="font-medium leading-none">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Umbral mínimo: {product.threshold}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-red-600">{product.stock}</span>
                                    <p className="text-xs text-muted-foreground">Stock Actual</p>
                                </div>
                                <Badge variant={product.status === 'CRITICAL' ? "destructive" : "secondary"}>
                                    {product.status === 'CRITICAL' ? 'CRÍTICO' : 'BAJO'}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
