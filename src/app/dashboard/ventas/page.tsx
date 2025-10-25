"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { orderService, type Order } from "@/services/order.service";
import { productService, type Product } from "@/services/product.service";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';

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
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";

export default function VentasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Mostrar 10 elementos por página

  const handleViewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setIsDetailsOpen(true);
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prevOrders => {
      const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
      
      if (orderExists) {
        // Actualizar orden existente
        return prevOrders.map(order => 
          order.id === updatedOrder.id ? updatedOrder : order
        );
      } else {
        // Si por alguna razón la orden no está en la lista, la agregamos
        return [updatedOrder, ...prevOrders];
      }
    });
    
    // Actualizar la orden seleccionada si es la misma
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    
    // Cerrar el diálogo si se completó la orden
    if (updatedOrder?.status === 'COMPLETED') {
      setIsDetailsOpen(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const productsResponse = await productService.getProducts(1, 100);
      setProducts(productsResponse.data || []);

      const ordersData = await orderService.getOrders();
      // No filtrar aquí, lo haremos localmente
      setOrders(ordersData);
      setCurrentPage(1); // Resetear a la primera página cuando cambian los datos
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Función de filtrado local para búsqueda en tiempo real
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) {
      return orders;
    }

    const term = searchTerm.toLowerCase();
    return orders.filter(
      (order) =>
        order.id?.toLowerCase().includes(term) ||
        order.paymentMethod?.toLowerCase().includes(term) ||
        order.client?.name?.toLowerCase().includes(term) ||
        order.client?.phone?.toLowerCase().includes(term) ||
        order.client?.email?.toLowerCase().includes(term) ||
        order.client?.dni?.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

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

  const handleCreateOrder = async (orderData: SaleData) => {
    try {
      console.log('Datos recibidos del formulario:', orderData);
      
      // Asegurarse de que los productos y servicios sean arrays
      const products = Array.isArray(orderData.products) ? orderData.products : [];
      const services = Array.isArray(orderData.services) 
        ? orderData.services as Array<{
            name: string;
            description?: string;
            price: number;
            type: 'REPAIR' | 'WARRANTY';
            photoUrls?: string[];
          }> 
        : [];

      // Función para asegurar que el tipo de servicio sea válido
      const getValidServiceType = (type?: string) => {
        return type === 'WARRANTY' ? 'WARRANTY' : 'REPAIR';
      };

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
        products?: Array<{
          productId: string;
          quantity: number;
        }>;
        services?: Array<{
          name: string;
          description?: string;
          price: number;
          type: 'REPAIR' | 'WARRANTY';
          photoUrls?: string[];
        }>;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAID';
      } = {
        clientInfo: {
          name: orderData.clientInfo?.name || 'Cliente Ocasional',
          ...(orderData.clientInfo?.email && { email: orderData.clientInfo.email }),
          ...(orderData.clientInfo?.phone && { phone: orderData.clientInfo.phone }),
          ...(orderData.clientInfo?.address && { address: orderData.clientInfo.address }),
          dni: orderData.clientInfo?.dni || '11111111',
          ...(orderData.clientInfo?.ruc && { ruc: orderData.clientInfo.ruc })
        },
        status: 'PENDING' as const
      };

      // Agregar productos si existen
      if (products.length > 0) {
        orderDataForBackend.products = products.map(product => ({
          productId: product.productId,
          quantity: product.quantity || 1
        }));
      }

      // Agregar servicios si existen
      if (services.length > 0) {
        orderDataForBackend.services = services.map(service => ({
          name: service.name || 'Servicio sin nombre',
          ...(service.description && { description: service.description }),
          price: service.price || 0,
          type: getValidServiceType(service.type),
          ...(service.photoUrls && service.photoUrls.length > 0 && { photoUrls: service.photoUrls })
        }));
      }

      console.log('Enviando datos al servicio de órdenes:', orderDataForBackend);
      
      const newOrder = await orderService.createOrder(orderDataForBackend);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      // No cerrar el modal aquí, dejar que el componente hijo maneje el cierre
      toast.success('Orden registrada exitosamente');
      return { success: true, orderId: newOrder.id, orderNumber: newOrder.orderNumber };
    } catch (error) {
      console.error('Error al crear la orden:', error);
      toast.error(`Error al crear la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { success: false };
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
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-medium">Nueva Venta</span>
                </Button>
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
                    <TableHead className="w-[80px] px-2 text-center hidden sm:table-cell">ID</TableHead>
                    <TableHead className="w-[90px] px-2 text-center">Fecha</TableHead>
                    <TableHead className="min-w-[120px] px-2 text-center">Cliente</TableHead>
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Productos</TableHead>
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Servicios</TableHead>
                    <TableHead className="w-[110px] px-2 text-center">Estado</TableHead>
                    <TableHead className="w-[100px] px-2 text-right">Total</TableHead>
                    <TableHead className="w-[50px] px-2 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order) => {
                      const shortDate = order.createdAt
                        ? format(new Date(order.createdAt), 'dd/MM/yy')
                        : 'N/A';
                      
                      const statusConfig = {
                        COMPLETED: {
                          text: 'Completado',
                          class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                          icon: '✓'
                        },
                        PENDING: {
                          text: 'Pendiente',
                          class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                          icon: '⏳'
                        },
                        CANCELLED: {
                          text: 'Cancelado',
                          class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                          icon: '✕'
                        }
                      };
                      
                      const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                        
                      const clientName = order.client?.name || 'Sin cliente';
                      const productCount = order.orderProducts?.length || 0;
                      const serviceCount = order.services?.length || 0;
                      
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50 group">
                          <TableCell className="px-2 py-3 text-center hidden sm:table-cell">
                            <div className="text-xs font-mono font-medium text-muted-foreground" title={order.id}>
                              {order.id.substring(0, 6)}...
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs sm:text-sm font-medium">{shortDate}</span>
                              <span className="text-xs text-muted-foreground">
                                {order.createdAt ? format(new Date(order.createdAt), 'HH:mm') : '-'}
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
                            <div className="flex items-center justify-center">
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
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-muted-foreground/50" />
                          <div className="text-center">
                            <p className="font-medium">
                              {searchTerm
                                ? `No se encontraron ventas que coincidan con "${searchTerm}"`
                                : 'No se encontraron ventas'
                              }
                            </p>
                            {searchTerm && (
                              <p className="text-sm mt-1">
                                Intenta con otros términos como ID, nombre del cliente, teléfono, email o DNI
                              </p>
                            )}
                          </div>
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
          
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {searchTerm ? 'No se encontraron ventas' : 'No hay ventas registradas'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {searchTerm
                  ? `No se encontraron ventas que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
                  : 'Comienza creando tu primera venta haciendo clic en el botón "Nueva Venta"'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera venta
                </Button>
              )}
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
        onSubmit={async (data) => {
          const transformedData: SaleData = {
            ...data,
            clientInfo: data.clientInfo ? {
              ...data.clientInfo,
              dni: data.clientInfo.dni || '11111111'
            } : undefined,
            products: data.products.map(p => ({
              ...p,
            }))
          };
          const result = await handleCreateOrder(transformedData);
          return result;
        }}
        products={products}
      />
    </div>
  );
}