// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  AlertCircle,
  DollarSign,
  Package,
  Wrench,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { dashboardService, DashboardStats } from "@/services/dashboard.service";
import {
  analyticsService,
  type AnalyticsIncomeResponse,
  type AnalyticsExpensesResponse,
  type NetProfitResponse,
} from "@/services/analytics.service";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
};

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

  const [analyticsFrom, setAnalyticsFrom] = useState<string>("");
  const [analyticsTo, setAnalyticsTo] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<"net-profit" | "income" | "expenses">("net-profit");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [netProfitData, setNetProfitData] = useState<NetProfitResponse | null>(null);
  const [incomeData, setIncomeData] = useState<AnalyticsIncomeResponse | null>(null);
  const [expensesData, setExpensesData] = useState<AnalyticsExpensesResponse | null>(null);
  
  const { currentStore, tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasCash = !tenantFeaturesLoaded || normalizedTenantFeatures.includes("CASH");
  const hasProducts = !tenantFeaturesLoaded || normalizedTenantFeatures.includes("PRODUCTS");
  const hasServices = !tenantFeaturesLoaded || normalizedTenantFeatures.includes("SERVICES");

  const fetchDashboardData = async () => {
    if (!currentStore) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Iniciando fetchDashboardData con servicio unificado...');

      const dashboardData = await dashboardService.getDashboardStats(currentStore.id);
      
      setStats(dashboardData);
      setLastUpdated(new Date());
      toast.success('Datos actualizados correctamente');

    } catch (err) {
      console.error('❌ Error en fetchDashboardData:', err);
      setError('No se pudieron cargar los datos del dashboard. Por favor, intente de nuevo.');
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const isValidDateRange = (from: string, to: string) => {
    if (!from || !to) return false;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false;
    return fromDate.getTime() <= toDate.getTime();
  };

  const fetchAnalyticsData = async () => {
    if (!currentStore) return;
    if (!isValidDateRange(analyticsFrom, analyticsTo)) return;

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      if (analysisType === "net-profit") {
        const data = await analyticsService.getNetProfit({ from: analyticsFrom, to: analyticsTo });
        setNetProfitData(data);
      }

      if (analysisType === "income") {
        const data = await analyticsService.getIncome({ from: analyticsFrom, to: analyticsTo });
        setIncomeData(data);
      }

      if (analysisType === "expenses") {
        const data = await analyticsService.getExpenses({ from: analyticsFrom, to: analyticsTo });
        setExpensesData(data);
      }
    } catch (err) {
      console.error("❌ Error en fetchAnalyticsData:", err);
      setAnalyticsError("No se pudieron cargar los datos de análisis. Por favor, intente de nuevo.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentStore]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [currentStore, analysisType, analyticsFrom, analyticsTo]);

  useEffect(() => {
    if (!hasCash && (analysisType === "income" || analysisType === "expenses")) {
      setAnalysisType("net-profit");
    }
  }, [hasCash, analysisType]);

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
          <TabsTrigger value="analytics">
            Análisis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un rango de fechas y un tipo de análisis.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Desde</label>
                  <Input
                    type="date"
                    value={analyticsFrom}
                    onChange={(e) => setAnalyticsFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Hasta</label>
                  <Input
                    type="date"
                    value={analyticsTo}
                    onChange={(e) => setAnalyticsTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de análisis</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value as any)}
                  >
                    <option value="net-profit">Ganancia neta</option>
                    {hasCash && <option value="income">Ingreso</option>}
                    {hasCash && <option value="expenses">Egreso</option>}
                  </select>
                </div>
              </div>

              {!isValidDateRange(analyticsFrom, analyticsTo) ? null : (
                <div className="flex justify-end">
                  <Button onClick={fetchAnalyticsData} disabled={analyticsLoading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${analyticsLoading ? "animate-spin" : ""}`} />
                    Actualizar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isValidDateRange(analyticsFrom, analyticsTo) ? (
            <>
              {analyticsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{analyticsError}</AlertDescription>
                </Alert>
              )}

              {analysisType === "net-profit" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ganancia neta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analyticsLoading && !netProfitData ? (
                      <div className="rounded-md border p-6 text-center text-muted-foreground">
                        Cargando...
                      </div>
                    ) : (netProfitData?.timeline?.length || 0) === 0 ? (
                      <div className="rounded-md border p-6 text-center text-muted-foreground">
                        No hay movimientos en este rango.
                      </div>
                    ) : (
                      <div className="rounded-md border p-4">
                        <div className="relative pl-6">
                          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-4">
                            {netProfitData!.timeline.map((item, idx) => (
                              <div key={`${item.date}-${idx}`} className="relative">
                                <div
                                  className={
                                    item.type === "INCOME"
                                      ? "absolute left-1.5 top-2 h-2.5 w-2.5 rounded-full bg-green-600"
                                      : "absolute left-1.5 top-2 h-2.5 w-2.5 rounded-full bg-red-600"
                                  }
                                />
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(item.date).toLocaleString()}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                      <Badge
                                        className={
                                          item.type === "INCOME"
                                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                                            : "bg-red-100 text-red-800 hover:bg-red-100"
                                        }
                                      >
                                        {item.type}
                                      </Badge>
                                      <span className="font-medium">{item.concept}</span>
                                    </div>
                                  </div>
                                  <div className="text-right font-medium whitespace-nowrap">
                                    {formatCurrency(item.amount)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total ingresos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(netProfitData?.totals?.totalIncome || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total egresos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(netProfitData?.totals?.totalExpenses || 0)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Ganancia neta</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(netProfitData?.totals?.netProfit || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysisType === "income" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {hasProducts && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(incomeData?.summary?.incomeProducts || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {hasServices && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Servicios</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(incomeData?.summary?.incomeServices || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {hasServices && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Top usuarios por servicios</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Usuario</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(incomeData?.rankings?.topUsersServices || []).length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                      No hay datos.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  (incomeData?.rankings?.topUsersServices || []).map((u) => (
                                    <TableRow key={u.userId}>
                                      <TableCell>{u.userName}</TableCell>
                                      <TableCell className="text-right font-medium">{formatCurrency(u.totalAmount ?? u.total ?? 0)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {hasProducts && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Top usuarios por ventas de productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Usuario</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(incomeData?.rankings?.topUsersProducts || []).length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                      No hay datos.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  (incomeData?.rankings?.topUsersProducts || []).map((u) => (
                                    <TableRow key={u.userId}>
                                      <TableCell>{u.userName}</TableCell>
                                      <TableCell className="text-right font-medium">{formatCurrency(u.totalAmount ?? u.total ?? 0)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {analysisType === "expenses" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de egresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(
                          expensesData?.totals?.totalExpenses ??
                            (expensesData?.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Detalle de egresos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Usuario</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Tipo de egreso</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analyticsLoading && !expensesData ? (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                  Cargando...
                                </TableCell>
                              </TableRow>
                            ) : (expensesData?.expenses || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                  No hay egresos en este rango.
                                </TableCell>
                              </TableRow>
                            ) : (
                              (expensesData?.expenses || []).map((e) => (
                                <TableRow key={e.sourceId || `${e.date}-${e.description}`}>
                                  <TableCell className="whitespace-nowrap">{new Date(e.date).toLocaleString()}</TableCell>
                                  <TableCell>{e.user?.name || "-"}</TableCell>
                                  <TableCell className="max-w-[300px] truncate">{e.description}</TableCell>
                                  <TableCell>{e.expenseType || "OTRO"}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}