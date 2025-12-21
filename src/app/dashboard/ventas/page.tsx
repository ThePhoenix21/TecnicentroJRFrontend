"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { orderService, type Order } from "@/services/order.service";
import { storeProductService } from "@/services/store-product.service";
import { type StoreProduct } from "@/types/store-product.types";
import { type Product } from "@/types/product.types";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';
import { useAuth } from "@/contexts/auth-context";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, X, Info, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/orders/OrderDetailsDialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function VentasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Mostrar 10 elementos por página
  const [hideOutsideCashSession, setHideOutsideCashSession] = useState(false);

  // Obtener currentStore y permisos del contexto
  const { currentStore, hasPermission, isAdmin, tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasSalesOfProducts = normalizedTenantFeatures.includes('SALESOFPRODUCTS');
  const hasSalesOfServices = normalizedTenantFeatures.includes('SALESOFSERVICES');
  const hasSalesFeatureGate = hasSalesOfProducts || hasSalesOfServices;

  const canSellProducts = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfProducts;
  const canViewInventory = isAdmin || hasPermission?.('VIEW_INVENTORY') || hasPermission?.('MANAGE_INVENTORY') || hasPermission?.('inventory.read') || hasPermission?.('inventory.manage');

  const canManageOrders = isAdmin || hasPermission?.("MANAGE_ORDERS");

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
    // Actualizar la orden seleccionada si es la misma
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    // Cerrar el diálogo de detalles si la orden se completa
    if (updatedOrder?.status === 'COMPLETED') {
      setIsDetailsOpen(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Usar storeProductService para obtener productos de la tienda actual
      if (currentStore) {
        if (canSellProducts && canViewInventory) {
          try {
            const productsResponse = await storeProductService.getStoreProducts(currentStore.id, 1, 100);
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
  }, [currentStore, canSellProducts, canViewInventory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Función de filtrado local para búsqueda en tiempo real y ordenamiento
  const filteredOrders = useMemo(() => {
    let result = [...orders]; // Crear una copia para no mutar el estado original

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.id?.toLowerCase().includes(term) ||
          order.paymentMethod?.toLowerCase().includes(term) ||
          order.client?.name?.toLowerCase().includes(term) ||
          order.client?.phone?.toLowerCase().includes(term) ||
          order.client?.email?.toLowerCase().includes(term) ||
          order.client?.dni?.toLowerCase().includes(term)
      );
    }

    // Filtrar por sesión de caja si está activo el checkbox
    if (hideOutsideCashSession) {
      result = result.filter((order) => order.cashSession?.status === "OPEN");
    }

    // Ordenar por fecha de creación (más reciente primero)
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [orders, searchTerm, hideOutsideCashSession]);

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
      id: sp.productId,
      storeProductId: sp.id, // Agregar el ID del store-product para que SaleForm lo use
      name: sp.product.name,
      description: sp.product.description || '',
      buycost: sp.product.buyCost || 0,
      createdById: sp.product.createdById || '',
      isDeleted: sp.product.isDeleted || false,
      createdAt: sp.product.createdAt || new Date().toISOString(),
      updatedAt: sp.product.updatedAt || new Date().toISOString(),
      // Campos adicionales que necesita SaleForm
      price: sp.price,
      stock: sp.stock,
      stockThreshold: sp.stockThreshold,
      basePrice: sp.product.basePrice || 0,
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
            name: string;
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
            name: service.name || 'Servicio sin nombre',
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
                  {[...Array(8)].map((_, i) => (
                    <TableHead key={i} className="h-10">
                      <div className="h-4 bg-muted rounded-md w-3/4 mx-auto"></div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {[...Array(8)].map((_, cellIndex) => (
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
                    <TableHead className="w-[80px] px-2 text-center hidden sm:table-cell">Order #</TableHead>
                    <TableHead className="w-[90px] px-2 text-center">Fecha</TableHead>
                    <TableHead className="min-w-[120px] px-2 text-center">Cliente</TableHead>
                    <TableHead className="w-[110px] px-2 text-center">Vendedor</TableHead>
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Productos</TableHead>
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Servicios</TableHead>
                    <TableHead className="w-[110px] px-2 text-center">Estado</TableHead>
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
                      const productCount = order.orderProducts?.length || 0;
                      const serviceCount = order.services?.length || 0;

                      const fromOpenSession = isOrderFromOpenCashSession(order);
                      return (
                        <TableRow
                          key={order.id || order.orderNumber || index}
                          className={`hover:bg-muted/50 group ${!fromOpenSession ? "opacity-60 bg-muted/40" : ""}`}
                        >
                          <TableCell className="px-2 py-3 text-center hidden sm:table-cell">
                            <div
                              className="text-xs font-mono font-medium text-muted-foreground"
                              title={order.orderNumber}
                            >
                              {order.orderNumber || 'N/A'}
                            </div>
                          </TableCell>
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
                                {clientName}
                              </span>
                              {order.client?.phone && (
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
                          <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                            {productCount > 0 ? (
                              <Badge variant="outline" className="text-xs py-0.5">
                                {productCount} {productCount === 1 ? 'prod.' : 'prod.'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
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
                          <TableCell className="px-2 py-3 text-right">
                            <span className="text-sm font-medium whitespace-nowrap">
                              S/{(order.totalAmount || 0).toLocaleString('es-PE')}
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
                      <TableCell colSpan={10} className="text-center py-12">
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
        products={transformStoreProductsToProducts(products)}
      />
    </div>
  );
}