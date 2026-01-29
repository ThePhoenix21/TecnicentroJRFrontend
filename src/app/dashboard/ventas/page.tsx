"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { orderService, type Order } from "@/services/order.service";
import { storeProductService } from "@/services/store-product.service";
import { type StoreProduct } from "@/types/store-product.types";
import { type Product } from "@/types/product.types";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, X, Info, ShoppingCart, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/orders/OrderDetailsDialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function VentasPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Mostrar 10 elementos por página
  const [hideOutsideCashSession, setHideOutsideCashSession] = useState(true);

  const CONSENT_PHRASE =
    "soy conciente de que los datos no se podran recuperar";
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);
  const [hardDeleteStep, setHardDeleteStep] = useState<"warning" | "form">("warning");
  const [hardDeleteFrom, setHardDeleteFrom] = useState<string>("");
  const [hardDeleteTo, setHardDeleteTo] = useState<string>("");
  const [hardDeleteEmail, setHardDeleteEmail] = useState<string>("");
  const [hardDeletePassword, setHardDeletePassword] = useState<string>("");
  const [hardDeleteReason, setHardDeleteReason] = useState<string>("");
  const [hardDeleteConsent, setHardDeleteConsent] = useState<string>("");
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);
  const [hardDeleteSubmitting, setHardDeleteSubmitting] = useState(false);

  // Obtener currentStore y permisos del contexto
  const { currentStore, hasPermission, isAdmin, tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasSalesOfProducts = normalizedTenantFeatures.includes('SALESOFPRODUCTS');
  const hasHardDeleteSalesHistory = normalizedTenantFeatures.includes('HARD_DELETE_SALES_HISTORY');
  const hasSalesOfServices = normalizedTenantFeatures.includes('SALESOFSERVICES');
  const hasNamedServices = normalizedTenantFeatures.includes('NAMEDSERVICES');
  const hasProductsFeature = normalizedTenantFeatures.includes('PRODUCTS');
  const hasSalesFeatureGate = hasSalesOfProducts || hasSalesOfServices;

  const tableColSpan = 7 + (isAdmin ? 1 : 0) + (hasProductsFeature ? 1 : 0);

  const canSellProducts = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfProducts;
  const canViewInventory = isAdmin || hasPermission?.('VIEW_INVENTORY') || hasPermission?.('MANAGE_INVENTORY') || hasPermission?.('inventory.read') || hasPermission?.('inventory.manage');
  // Los usuarios que pueden vender deben poder ver los productos para crear órdenes
  const canViewProductsForSales = canSellProducts && (isAdmin || hasPermission?.('MANAGE_ORDERS') || hasPermission?.('CREATE_ORDERS') || hasPermission?.('orders.create') || hasPermission?.('orders.manage'));

  const canManageOrders = isAdmin || hasPermission?.("MANAGE_ORDERS");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Usar storeProductService para obtener productos simples de la tienda actual
      if (currentStore) {
        if (canSellProducts && (canViewInventory || canViewProductsForSales)) {
          try {
            const productsResponse = await storeProductService.getStoreProductsSimple(currentStore.id);
            const productsArray = productsResponse.data || [];
            setProducts(productsArray);
          } catch (error) {
            console.error("Error al cargar productos:", error);
            setProducts([]);
          }
        } else {
          setProducts([]);
        }

        try {
          // Cargar órdenes solo de la tienda actual
          const ordersData = await orderService.getOrdersByStore(currentStore.id);
          setOrders(ordersData);
        } catch (error) {
          console.error("Error al cargar órdenes:", error);
          setOrders([]);
        }
      } else {
        setProducts([]);
        setOrders([]);
      }

      setCurrentPage(1); // Resetear a la primera página cuando cambian los datos
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [currentStore, canSellProducts, canViewInventory, canViewProductsForSales]);

  const resetHardDeleteModal = useCallback(() => {
    setHardDeleteStep("warning");
    setHardDeleteFrom("");
    setHardDeleteTo("");
    setHardDeleteEmail("");
    setHardDeletePassword("");
    setHardDeleteReason("");
    setHardDeleteConsent("");
    setHardDeleteError(null);
    setHardDeleteSubmitting(false);
  }, []);

  const handleHardDeleteOpenChange = useCallback(
    (open: boolean) => {
      setIsHardDeleteOpen(open);
      if (!open) resetHardDeleteModal();
    },
    [resetHardDeleteModal]
  );

  const toUtcRange = (from: string, to: string) => {
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;
    return { fromDate, toDate };
  };

  const handleHardDeleteSubmit = useCallback(async () => {
    setHardDeleteError(null);

    if (!hardDeleteFrom || !hardDeleteTo) {
      setHardDeleteError('Debes seleccionar las fechas "desde" y "hasta".');
      return;
    }

    const fromTime = new Date(`${hardDeleteFrom}T00:00:00.000Z`).getTime();
    const toTime = new Date(`${hardDeleteTo}T23:59:59.999Z`).getTime();
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime) {
      setHardDeleteError('El rango de fechas no es válido.');
      return;
    }

    if (!hardDeleteEmail.trim() || !hardDeletePassword) {
      setHardDeleteError('Debes ingresar email y contraseña.');
      return;
    }

    if (!hardDeleteReason.trim()) {
      setHardDeleteError('Debes indicar un motivo.');
      return;
    }

    if (hardDeleteConsent.trim() !== CONSENT_PHRASE) {
      setHardDeleteError('La frase de consentimiento está mal escrita.');
      return;
    }

    try {
      setHardDeleteSubmitting(true);
      const { fromDate, toDate } = toUtcRange(hardDeleteFrom, hardDeleteTo);

      await orderService.hardDeleteOrdersByDateRange({
        fromDate,
        toDate,
        email: hardDeleteEmail.trim(),
        password: hardDeletePassword,
        reason: hardDeleteReason.trim(),
      });

      toast.success('Ventas eliminadas de forma definitiva.');
      handleHardDeleteOpenChange(false);
      loadData();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo eliminar el historial de ventas.';
      setHardDeleteError(String(message));
    } finally {
      setHardDeleteSubmitting(false);
    }
  }, [
    CONSENT_PHRASE,
    hardDeleteConsent,
    hardDeleteEmail,
    hardDeleteFrom,
    hardDeletePassword,
    hardDeleteReason,
    hardDeleteTo,
    handleHardDeleteOpenChange,
    loadData,
    router,
  ]);

  const handleViewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setIsDetailsOpen(true);
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    if (updatedOrder?.status === 'COMPLETED') {
      setIsDetailsOpen(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Función de filtrado local para búsqueda en tiempo real y ordenamiento
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  useEffect(() => {
    const filterOrders = async () => {
      let result = [...orders]; // Crear una copia para no mutar el estado original

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (order) =>
            order.id?.toLowerCase().includes(term) ||
            (order.paymentMethods || []).some((pm) => {
              const type = String(pm?.type || '').toLowerCase();
              const amount = String(pm?.amount ?? '').toLowerCase();
              return type.includes(term) || amount.includes(term);
            }) ||
            order.client?.name?.toLowerCase().includes(term) ||
            order.client?.phone?.toLowerCase().includes(term) ||
            order.client?.email?.toLowerCase().includes(term) ||
            order.client?.dni?.toLowerCase().includes(term)
        );
      }

      // Filtrar por sesión de caja si está activo el checkbox
      if (hideOutsideCashSession && currentStore?.id) {
        try {
          const { cashService } = await import("@/services/cash.service");
          const currentSession = await cashService.getCurrentCashSession(currentStore.id);
          if (currentSession && currentSession.status === 'OPEN') {
            result = result.filter((order) => order.cashSession?.id === currentSession.id);
          } else {
            // If no open session, return empty array
            result = [];
          }
        } catch (error) {
          console.warn('Could not get current cash session for filtering:', error);
          // If we can't get the session, show all orders (fallback behavior)
        }
      }

      // Ordenar por fecha de creación (más reciente primero)
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setFilteredOrders(result);
    };

    filterOrders();
  }, [orders, searchTerm, hideOutsideCashSession, currentStore]);

  // Lógica de paginación basada en los datos filtrados
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1); // Resetear a la primera página al limpiar búsqueda
  };

  const isOrderFromOpenCashSession = (order: Order) => {
    return order.cashSession?.status === "OPEN";
  };

  // Transformar StoreProduct[] a Product[] para compatibilidad con SaleForm
  const transformStoreProductsToProducts = useCallback((storeProducts: StoreProduct[]): Product[] => {
    const transformed = storeProducts.map(sp => ({
      id: sp.product.id, // Usar el ID del producto base
      storeProductId: sp.id, // Agregar el ID del store-product para que SaleForm lo use
      name: sp.product.name,
      description: '', // El endpoint simple no incluye descripción
      buycost: 0, // El endpoint simple no incluye buyCost
      createdById: '',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Campos del endpoint simple
      price: Number(sp.price) || 0,
      stock: sp.stock,
      stockThreshold: 0, // El endpoint simple no incluye stockThreshold
      basePrice: Number(sp.price) || 0, // Usar el price como basePrice
    }));
    return transformed;
  }, []);

  const handleCreateOrder = async (orderData: SaleData) => {
    try {
      if (!canManageOrders) {
        throw new Error('No tienes permisos para crear órdenes (MANAGE_ORDERS requerido)');
      }
      
      // Asegurarse de que los productos y servicios sean arrays
      const products = Array.isArray(orderData.products) ? orderData.products : [];
      const services = Array.isArray(orderData.services) 
        ? orderData.services as Array<{
            name?: string;
            description?: string;
            price: number;
            type: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';
            photoUrls?: string[];
            payments?: Array<{
              type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
              amount: number;
            }>;
          }> 
        : [];

      // Función para asegurar que el tipo de servicio sea válido
      const getValidServiceType = (type?: string) => {
        if (type === 'WARRANTY') return 'WARRANTY';
        if (type === 'MISELANEOUS') return 'MISELANEOUS';
        if (type === 'OTHER') return 'MISELANEOUS';
        return 'REPAIR';
      };

      // Validar que se tenga cashSessionId (obligatorio según el nuevo servicio)
      if (!orderData.cashSessionId) {
        throw new Error('El ID de la sesión de caja es obligatorio para crear una orden');
      }

      // Transformar los datos al formato esperado por el backend
      const orderDataForBackend: {
        clientInfo?: {
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          dni: string;
          ruc?: string;
        };
        paymentMethods?: Array<{
          type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
          amount: number;
        }>;
        products?: Array<{
          productId: string;
          quantity: number;
          price?: number;
          payments?: Array<{
            type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
            amount: number;
          }>;
        }>;
        services?: Array<{
          name: string;
          description?: string;
          price: number;
          type: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';
          photoUrls?: string[];
          payments?: Array<{
            type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
            amount: number;
          }>;
        }>;
        cashSessionId: string;
      } = {
        clientInfo: {
          name: orderData.clientInfo?.name || 'Cliente Ocasional',
          ...(orderData.clientInfo?.email && { email: orderData.clientInfo.email }),
          ...(orderData.clientInfo?.phone && { phone: orderData.clientInfo.phone }),
          ...(orderData.clientInfo?.address && { address: orderData.clientInfo.address }),
          dni: orderData.clientInfo?.dni || '00000000',
          ...(orderData.clientInfo?.ruc && { ruc: orderData.clientInfo.ruc })
        },
        ...(orderData.paymentMethods && { paymentMethods: orderData.paymentMethods }),
        cashSessionId: orderData.cashSessionId
      };

      // Agregar productos si existen
      if (products.length > 0) {
        orderDataForBackend.products = products.map((product, index) => {
          // Validar y transformar métodos de pago al nuevo formato
          const validPayments = product.payments?.filter(payment => {
            const validTypes = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'DATAPHONE', 'BIZUM', 'OTRO'];
            return validTypes.includes(payment.type) && payment.amount > 0;
          }) || [];

          // Crear el objeto base del producto
          const productData: {
            productId: string;
            quantity: number;
            price?: number;
            payments?: Array<{
              type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
              amount: number;
            }>;
          } = {
            productId: product.productId,
            quantity: product.quantity || 1
          };
          
          // Si hay un precio personalizado, lo usamos como precio final
          if (product.customPrice !== undefined && product.customPrice > 0 && product.customPrice !== product.price) {
            productData.price = product.customPrice;
          } else if (product.price !== undefined) {
            productData.price = product.price;
          }

          // Incluir métodos de pago validados si existen
          if (validPayments.length > 0) {
            productData.payments = validPayments;
          }
          
          return productData;
        });
      }

      // Agregar servicios si existen
      if (services.length > 0) {
        orderDataForBackend.services = services.map(service => {
          // Para servicios, los pagos son opcionales y se consideran adelantos
          // Solo incluir si hay pagos válidos (adelantos)
          const validPayments = service.payments?.filter(payment => {
            const validTypes = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'DATAPHONE', 'BIZUM', 'OTRO'];
            return validTypes.includes(payment.type) && payment.amount > 0;
          }) || [];

          const serviceData: {
            name: string;
            description?: string;
            price: number;
            type: "REPAIR" | "WARRANTY" | "MISELANEOUS";
            photoUrls?: string[];
            payments?: Array<{
              type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'DATAPHONE' | 'BIZUM' | 'OTRO';
              amount: number;
            }>;
          } = {
            name: service.name?.trim() || 'Defauld_Service',
            ...(service.description && { description: service.description }),
            price: service.price || 0,
            type: getValidServiceType(service.type) as "REPAIR" | "WARRANTY" | "MISELANEOUS",
            ...(service.photoUrls && service.photoUrls.length > 0 && { photoUrls: service.photoUrls })
          };

          // Incluir pagos solo si existen (adelantos)
          // Si no hay pagos, el backend creará la orden en PENDING sin movimiento de caja
          if (validPayments.length > 0) {
            serviceData.payments = validPayments;
          }

          return serviceData;
        });
      }

      const newOrder = await orderService.createOrder(orderDataForBackend);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      // No cerrar el modal aquí, dejar que el componente hijo maneje el cierre
      toast.success('Orden registrada exitosamente');
      return { success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber, orderData: newOrder };
    } catch (error) {
      console.error('Error al crear la orden:', error);
      // No mostrar toast aquí, dejar que el componente hijo maneje el error
      // Propagar el error para que sea manejado por el componente hijo
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded-md animate-pulse"></div>
              <div className="h-4 w-64 bg-muted rounded-md animate-pulse"></div>
            </div>
            <div className="h-9 w-32 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-full max-w-2xl bg-muted rounded-md animate-pulse"></div>
        </div>
        
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {[...Array(tableColSpan)].map((_, i) => (
                    <TableHead key={i} className="h-10">
                      <div className="h-4 bg-muted rounded-md w-3/4 mx-auto"></div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {[...Array(tableColSpan)].map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="h-16">
                        <div className="h-4 bg-muted rounded-md w-3/4 mx-auto"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Ventas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administra y revisa el historial de ventas
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {canManageOrders && (
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="font-medium">Nueva Venta</span>
                  </Button>
                )}

                {isAdmin && hasHardDeleteSalesHistory && (
                  <Button
                    onClick={() => setIsHardDeleteOpen(true)}
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="font-medium">Borrar historial</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="w-full">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por ID, cliente, teléfono, email o DNI..."
                    className="pl-9 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  id="hide-outside-cash-session-orders"
                  checked={hideOutsideCashSession}
                  onCheckedChange={(checked) => {
                    setHideOutsideCashSession(Boolean(checked));
                    setCurrentPage(1);
                  }}
                />
                <label
                  htmlFor="hide-outside-cash-session-orders"
                  className="cursor-pointer select-none"
                >
                  Mostrar solo órdenes de la sesión de caja abierta
                </label>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>
                  {searchTerm ? (
                    <>
                      Mostrando <strong>{paginatedOrders.length}</strong> de <strong>{filteredOrders.length}</strong> ventas
                      {filteredOrders.length !== orders.length && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {' '}(filtrado de {orders.length} total)
                        </span>
                      )}
                      {currentPage > 1 && ` - página ${currentPage} de ${totalPages}`}
                    </>
                  ) : (
                    <>
                      Mostrando <strong>{paginatedOrders.length}</strong> de <strong>{orders.length}</strong> ventas
                      {currentPage > 1 && ` - página ${currentPage} de ${totalPages}`}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-0">
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[90px] px-2 text-center">Fecha</TableHead>
                    <TableHead className="min-w-[120px] px-2 text-center">{hasNamedServices ? 'Nombre' : 'Cliente'}</TableHead>
                    {isAdmin && (
                      <TableHead className="w-[110px] px-2 text-center">Vendedor</TableHead>
                    )}
                    {hasProductsFeature && (
                      <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Productos</TableHead>
                    )}
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Servicios</TableHead>
                    <TableHead className="w-[110px] px-2 text-center">Estado</TableHead>
                    <TableHead className="min-w-[160px] px-2 text-center hidden md:table-cell">Método</TableHead>
                    <TableHead className="w-[100px] px-2 text-right">Total</TableHead>
                    <TableHead className="w-[50px] px-2 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order, index) => {
                      const shortDate = order.createdAt
                        ? format(new Date(order.createdAt), 'dd/MM/yy')
                        : 'N/A';

                      const statusConfig = {
                        COMPLETED: {
                          text: 'Completado',
                          class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                          icon: '✓',
                        },
                        PENDING: {
                          text: 'Pendiente',
                          class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                          icon: '⏳',
                        },
                        CANCELLED: {
                          text: 'Anulado',
                          class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                          icon: '✕',
                        },
                      };

                      // Inicializar con el estado actual de la orden
                      let calculatedStatus = order.status;

                      // Si la orden está cancelada en la base de datos, mantener ese estado
                      if (order.status === 'CANCELLED') {
                        calculatedStatus = 'CANCELLED';
                      }
                      // Solo aplicar la lógica de servicios si la orden no está cancelada
                      else if (order.services && order.services.length > 0) {
                        const nonCanceledServices = order.services.filter(
                          (service) => service.status !== 'ANNULLATED'
                        );

                        if (nonCanceledServices.length > 0) {
                          calculatedStatus = nonCanceledServices.every(
                            (service) => service.status === 'COMPLETED'
                          )
                            ? 'COMPLETED'
                            : 'PENDING';
                        } else {
                          calculatedStatus = 'CANCELLED';
                        }
                      }

                      const status =
                        statusConfig[
                          calculatedStatus as keyof typeof statusConfig
                        ] || statusConfig.PENDING;

                      const clientName = order.client?.name || 'Sin cliente';
                      const displayName = hasNamedServices
                        ? (order.services?.[0]?.name || 'Sin nombre')
                        : clientName;
                      const productCount = order.orderProducts?.length || 0;
                      const serviceCount = order.services?.length || 0;
                      const paymentMethods = order.paymentMethods || [];

                      const fromOpenSession = isOrderFromOpenCashSession(order);
                      return (
                        <TableRow
                          key={order.id || index}
                          className={`hover:bg-muted/50 group ${!fromOpenSession ? "opacity-60 bg-muted/40" : ""}`}
                        >
                          <TableCell className="px-2 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs sm:text-sm font-medium">
                                {shortDate}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {order.createdAt
                                  ? format(new Date(order.createdAt), 'HH:mm')
                                  : '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[180px] mx-auto">
                                {displayName}
                              </span>
                              {!hasNamedServices && order.client?.phone && (
                                <a
                                  href={`tel:${order.client.phone}`}
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[180px] mx-auto"
                                  title={`Llamar a ${clientName}`}
                                >
                                  {order.client.phone}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="px-2 py-3">
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[180px] mx-auto">
                                  {order.user?.name || 'Sistema'}
                                </span>
                                {order.user?.email && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px] mx-auto">
                                    {order.user.email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {hasProductsFeature && (
                            <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                              {productCount > 0 ? (
                                <Badge variant="outline" className="text-xs py-0.5">
                                  {productCount} {productCount === 1 ? 'prod.' : 'prod.'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                            {serviceCount > 0 ? (
                              <Badge variant="outline" className="text-xs py-0.5">
                                {serviceCount} {serviceCount === 1 ? 'serv.' : 'serv.'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <div className="flex flex-col items-center justify-center">
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class} whitespace-nowrap`}
                                title={status.text}
                              >
                                <span className="mr-1">{status.icon}</span>
                                <span className="hidden sm:inline">{status.text}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                            {paymentMethods.length > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                {paymentMethods.map((pm) => (
                                  <span
                                    key={pm?.id || `${pm?.type}-${pm?.amount}`}
                                    className="text-xs whitespace-nowrap"
                                    title={String(pm?.type || '')}
                                  >
                                    {paymentMethods.length > 1
                                      ? `${pm?.type || '-'} ${formatCurrency(Number(pm?.amount) || 0)}`
                                      : (pm?.type || '-')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-right">
                            <span className="text-sm font-medium whitespace-nowrap">
                              {formatCurrency(order.totalAmount || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleViewOrder(order.id)}
                                title="Ver detalles"
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={tableColSpan} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                          <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium text-muted-foreground">
                            {searchTerm
                              ? 'No se encontraron ventas'
                              : 'No hay ventas registradas'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-md">
                            {searchTerm
                              ? `No se encontraron ventas que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
                              : 'Comienza creando tu primera venta haciendo clic en el botón "Nueva Venta"'}
                          </p>
                          {!searchTerm && canManageOrders && (
                            <Button
                              onClick={() => setIsFormOpen(true)}
                              className="mt-4"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Crear venta
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Controles de paginación */}
          {filteredOrders.length > itemsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Página anterior</span>
                  ←
                </Button>
                
                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Página siguiente</span>
                  →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      <SaleForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          // Recargar la lista después de cerrar el modal para asegurarse de que la nueva venta aparezca
          loadData();
        }}
        onSubmit={async (data: SaleData) => {
          const transformedData: SaleData = {
            ...data,
            clientInfo: data.clientInfo ? {
              ...data.clientInfo,
              dni: data.clientInfo.dni || '00000000'
            } : undefined,
            products: data.products?.map(p => ({
              ...p,
            })) || [],
            cashSessionId: data.cashSessionId || ''
          };
          const result = await handleCreateOrder(transformedData);
          return result;
        }}
        products={canViewProductsForSales ? transformStoreProductsToProducts(products) : []}
      />

      <Dialog open={isHardDeleteOpen} onOpenChange={handleHardDeleteOpenChange}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={!hardDeleteSubmitting}>
          {hardDeleteStep === 'warning' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Borrado definitivo de ventas
                </DialogTitle>
                <DialogDescription>
                  Esta acción es absoluta y no hay forma de revertir este cambio. Se eliminarán de forma permanente los datos
                  del historial de ventas dentro del rango de fechas que indiques.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleHardDeleteOpenChange(false)}
                  disabled={hardDeleteSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setHardDeleteStep('form')}
                  disabled={hardDeleteSubmitting}
                >
                  Deseo borrar los datos de forma definitiva
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirmación final
                </DialogTitle>
                <DialogDescription>
                  Para continuar debes reingresar tus credenciales, seleccionar el rango de fechas y escribir la frase de
                  consentimiento exactamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-from">Desde</Label>
                    <Input
                      id="hard-delete-from"
                      type="date"
                      value={hardDeleteFrom}
                      onChange={(e) => setHardDeleteFrom(e.target.value)}
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-to">Hasta</Label>
                    <Input
                      id="hard-delete-to"
                      type="date"
                      value={hardDeleteTo}
                      onChange={(e) => setHardDeleteTo(e.target.value)}
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hard-delete-reason">Motivo</Label>
                  <Input
                    id="hard-delete-reason"
                    value={hardDeleteReason}
                    onChange={(e) => setHardDeleteReason(e.target.value)}
                    placeholder="Ej: Limpieza por error de carga masiva"
                    disabled={hardDeleteSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-email">Email</Label>
                    <Input
                      id="hard-delete-email"
                      type="email"
                      value={hardDeleteEmail}
                      onChange={(e) => setHardDeleteEmail(e.target.value)}
                      autoComplete="email"
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-password">Contraseña</Label>
                    <Input
                      id="hard-delete-password"
                      type="password"
                      value={hardDeletePassword}
                      onChange={(e) => setHardDeletePassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hard-delete-consent">
                    Escriba lo siguiente: "{CONSENT_PHRASE}"
                  </Label>
                  <textarea
                    id="hard-delete-consent"
                    value={hardDeleteConsent}
                    onChange={(e) => setHardDeleteConsent(e.target.value)}
                    disabled={hardDeleteSubmitting}
                    className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  ></textarea>
                </div>

                {hardDeleteError && (
                  <div className="text-sm text-destructive">
                    {hardDeleteError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHardDeleteStep('warning')}
                  disabled={hardDeleteSubmitting}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleHardDeleteSubmit}
                  disabled={hardDeleteSubmitting}
                >
                  {hardDeleteSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Borrar definitivamente'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}