// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  RefreshCw, 
  AlertCircle,
  DollarSign,
  Package,
  Wrench,
  Users
} from "lucide-react";
import { toast } from "sonner";
import {
  dashboardService,
  type DashboardStats,
} from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
};

// Stat Card Component
const StatCard = ({ title, value, description, icon, loading = false }: StatCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-6 w-6 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await dashboardService.getDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
      toast.success('Datos actualizados correctamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar los datos';

      // Si hay problemas específicos con los datos, mostrar información más detallada
      if (errorMessage.includes('clients') || errorMessage.includes('clientes')) {
        setError('No se pudieron cargar los datos de clientes. Verifica que el servidor esté funcionando correctamente.');
      } else {
        setError('No se pudieron cargar los datos del dashboard. Por favor, intente de nuevo.');
      }

      toast.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Última actualización: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="analytics" disabled>
            Análisis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Tarjetas de Resumen */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Ventas Totales"
              value={loading ? '...' : formatCurrency(stats?.salesSummary?.total || 0)}
              description={`${stats?.salesSummary?.count || 0} ventas`}
              icon={<DollarSign className="h-4 w-4" />}
              loading={loading}
            />
            
            <StatCard
              title="Clientes"
              value={loading ? '...' : stats?.clientsSummary?.total || 0}
              description={`${stats?.clientsSummary?.newThisMonth || 0} nuevos este mes`}
              icon={<Users className="h-4 w-4" />}
              loading={loading}
            />

            <StatCard
              title="Productos"
              value={loading ? '...' : stats?.productsSummary?.total || 0}
              description={`${stats?.productsSummary?.lowStock || 0} con bajo stock`}
              icon={<Package className="h-4 w-4" />}
              loading={loading}
            />

            <StatCard
              title="Servicios"
              value={loading ? '...' : stats?.servicesSummary?.total || 0}
              description={`${stats?.servicesSummary?.mostPopular || 'Ninguno'}`}
              icon={<Wrench className="h-4 w-4" />}
              loading={loading}
            />
          </div>

          {/* Sección de Ventas Recientes y Productos Destacados */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Ventas Recientes */}
            <Card className="col-span-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Ventas Recientes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : stats?.recentSales && stats.recentSales.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <DollarSign className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Venta #{sale.id.substring(0, 6)}</p>
                            <p className="text-sm text-muted-foreground">
                              {sale.customerName} • {sale.itemsCount} {sale.itemsCount === 1 ? 'item' : 'items'}
                              {sale.userName && sale.userName !== 'Usuario' && (
                                <span className="ml-2">• <span className="font-medium">{sale.userName}</span></span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(sale.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ventas recientes
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Productos Destacados */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Productos Destacados</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Cargando...' : `Top ${Math.min(5, stats?.topProducts?.length || 0)} productos`}
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-md" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats?.topProducts && stats.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-md bg-secondary">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Stock: {product.value} • Precio: {formatCurrency(product.price || 0)}
                            </p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {product.description.length > 50 ? `${product.description.substring(0, 50)}...` : product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos destacados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
