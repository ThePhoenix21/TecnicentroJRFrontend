"use client";

import { useCallback, useEffect, useState } from "react";
import { serviceService, Service, ServiceStatus, ServiceType, ServiceWithClient } from "@/services/service.service";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, X, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServiceDetailsModal from "@/components/service/ServiceDetailsModal";
import { useAuth } from "@/contexts/auth-context";
import { orderService, type Order } from "@/services/order.service";
import { Checkbox } from "@/components/ui/checkbox";

export default function ServiciosPage() {
  const { currentStore, hasPermission, isAdmin } = useAuth();
  const canViewServices = isAdmin || hasPermission?.("VIEW_SERVICES") || hasPermission?.("MANAGE_SERVICES");
  const [services, setServices] = useState<ServiceWithClient[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceWithClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ServiceType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hideOutsideCashSession, setHideOutsideCashSession] = useState(false);

  const loadServices = useCallback(async (search: string = "", status?: ServiceStatus, type?: ServiceType) => {
    if (!currentStore || !canViewServices) {
      setServices([]);
      setFilteredServices([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await serviceService.getServicesWithClients(
        status,
        type,
        currentStore.id
      );
      // Filtrar por búsqueda localmente si se proporciona
      const filteredData = search 
        ? data.filter(service => 
            service.name.toLowerCase().includes(search.toLowerCase()) ||
            service.description?.toLowerCase().includes(search.toLowerCase()) ||
            service.client?.name?.toLowerCase().includes(search.toLowerCase())
          )
        : data;
      setServices(data);
      setFilteredServices(filteredData);

      // Cargar ordenes de la tienda actual para saber la sesion de caja asociada
      try {
        const ordersData = await orderService.getOrdersByStore(currentStore.id);
        setOrders(ordersData);
      } catch (ordersError) {
        console.error("Error loading orders for services page:", ordersError);
        setOrders([]);
      }
      setCurrentPage(1); // Resetear a la primera página al cargar nuevos datos
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  }, [currentStore, canViewServices]);

  useEffect(() => {
    if (currentStore && canViewServices) {
      loadServices("", statusFilter === "all" ? undefined : statusFilter, typeFilter === "all" ? undefined : typeFilter);
    }
  }, [loadServices, statusFilter, typeFilter, currentStore, canViewServices]);

  const isServiceFromOpenCashSession = (service: ServiceWithClient) => {
    if (!service.orderId) return false;
    const relatedOrder = orders.find((order) => order.id === service.orderId);
    if (!relatedOrder || !relatedOrder.cashSession) return false;
    return relatedOrder.cashSession.status === "OPEN";
  };

  // Filtro local para búsqueda en tiempo real y ordenamiento
  useEffect(() => {
    let filtered = [...services];

    if (searchTerm.trim()) {
      filtered = filtered.filter((service) =>
        service.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (service.client?.name && service.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        service.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    setFilteredServices(filtered);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [searchTerm, services]);

  // Lógica de paginación (considerando filtro de sesión de caja)
  const effectiveServices = hideOutsideCashSession
    ? filteredServices.filter((service) => isServiceFromOpenCashSession(service))
    : filteredServices;

  const totalPages = Math.ceil(effectiveServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = effectiveServices.slice(startIndex, endIndex);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStore && canViewServices) {
      loadServices(searchTerm, statusFilter === "all" ? undefined : statusFilter, typeFilter === "all" ? undefined : typeFilter);
    }
  };

  const handleStatusUpdate = () => {
    if (currentStore && canViewServices) {
      loadServices(searchTerm, statusFilter === "all" ? undefined : statusFilter, typeFilter === "all" ? undefined : typeFilter);
    }
  };

  const handleServiceClick = (service: ServiceWithClient) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  

  const getStatusBadge = (status?: ServiceStatus) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status) {
      case ServiceStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case ServiceStatus.IN_PROGRESS:
      return "bg-orange-300 text-orange-900 font-bold";

      case ServiceStatus.COMPLETED:
      return "bg-green-600 text-white font-bold";
      case ServiceStatus.CANCELLED:
        return "bg-gray-100 text-gray-800";
      case ServiceStatus.DELIVERED:
        return "bg-purple-100 text-purple-800";
      case ServiceStatus.PAID:
        return "bg-cyan-100 text-cyan-800";
      case ServiceStatus.ANNULLATED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const translateStatus = (status?: ServiceStatus) => {
    if (!status) return "No especificado";

    const statusMap: Record<ServiceStatus, string> = {
      [ServiceStatus.PENDING]: "Pendiente",
      [ServiceStatus.IN_PROGRESS]: "En Progreso",
      [ServiceStatus.COMPLETED]: "Completado",
      [ServiceStatus.CANCELLED]: "Cancelado",
      [ServiceStatus.DELIVERED]: "Entregado",
      [ServiceStatus.PAID]: "Pagado",
      [ServiceStatus.ANNULLATED]: "Anulado"
    };
    return statusMap[status] || status;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined) return "S/0.00";
    return `S/${price.toFixed(2)}`;
  };

  const formatShortId = (id?: string) => {
    if (!id) return "N/A";
    return id.substring(0, 6) + "...";
  };

  if (!canViewServices) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Servicios</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          No tienes permisos para ver esta sección (se requiere VIEW_SERVICES o MANAGE_SERVICES).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 pb-20 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">
            Lista de servicios realizados a clientes
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">Servicios</CardTitle>
            <form onSubmit={handleSearch} className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por ID, nombre, cliente o estado..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        loadServices('', statusFilter === "all" ? undefined : statusFilter, typeFilter === "all" ? undefined : typeFilter);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ServiceStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={ServiceStatus.PENDING}>Pendiente</SelectItem>
                    <SelectItem value={ServiceStatus.IN_PROGRESS}>En Progreso</SelectItem>
                    <SelectItem value={ServiceStatus.COMPLETED}>Completado</SelectItem>
                    <SelectItem value={ServiceStatus.CANCELLED}>Cancelado</SelectItem>
                    <SelectItem value={ServiceStatus.DELIVERED}>Entregado</SelectItem>
                    <SelectItem value={ServiceStatus.PAID}>Pagado</SelectItem>
                    <SelectItem value={ServiceStatus.ANNULLATED}>Anulado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ServiceType | "all")}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={ServiceType.REPAIR}>Reparación</SelectItem>
                    <SelectItem value={ServiceType.MAINTENANCE}>Mantenimiento</SelectItem>
                    <SelectItem value={ServiceType.INSPECTION}>Inspección</SelectItem>
                    <SelectItem value={ServiceType.WARRANTY}>Garantía</SelectItem>
                    <SelectItem value={ServiceType.CUSTOM}>Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  Buscar
                </Button>
              </div>
            </form>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              id="hide-outside-cash-session"
              checked={hideOutsideCashSession}
              onCheckedChange={(checked) => {
                setHideOutsideCashSession(Boolean(checked));
                setCurrentPage(1);
              }}
            />
            <label
              htmlFor="hide-outside-cash-session"
              className="cursor-pointer select-none"
            >
              Mostrar solo servicios de la sesión de caja abierta
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          {!currentStore ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-4">
                <Info className="h-8 w-8 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sin Tienda Seleccionada</h3>
              <p className="text-sm">
                Por favor, selecciona una tienda para ver los servicios.
              </p>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm.trim()
                ? `No se encontraron servicios que coincidan con "${searchTerm}"`
                : "No se encontraron servicios registrados en esta tienda"
              }
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-4 pt-4">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando {paginatedServices.length} de {filteredServices.length} servicios
                  {searchTerm.trim() && ` (filtrados de ${services.length})`}
                  {currentStore && ` en "${currentStore.name}"`}
                </span>
              </div>
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="hidden md:block">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedServices.map((service) => {
                        const fromOpenSession = isServiceFromOpenCashSession(service);
                        return (
                        <TableRow
                          key={service.id}
                          className={`cursor-pointer hover:bg-accent/50 ${!fromOpenSession ? "opacity-60 bg-muted/40" : ""}`}
                          onClick={() => handleServiceClick(service)}
                        >
                          <TableCell className="font-medium">
                            {formatShortId(service.id)}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {service.client?.name || "Sin cliente"}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="font-medium">{service.name}</div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(
                                service.status
                              )}`}
                            >
                              {translateStatus(service.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(service.price)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {service.createdAt
                              ? format(new Date(service.createdAt), 'dd/MM/yy')
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleServiceClick(service);
                              }}
                              className="h-8 px-2 text-xs sm:text-sm"
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Vista de tarjetas para móviles */}
              <div className="md:hidden space-y-3">
                {paginatedServices.map((service) => {
                  const fromOpenSession = isServiceFromOpenCashSession(service);
                  return (
                  <Card 
                    key={service.id} 
                    className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${!fromOpenSession ? "opacity-60 bg-muted/40" : ""}`}
                    onClick={() => handleServiceClick(service)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {service.client?.name || "Sin cliente"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            service.status
                          )}`}
                        >
                          {translateStatus(service.status)}
                        </span>
                      </div>
                      
                      {service.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      
                      <div className="mt-3 flex justify-between items-center text-sm">
                        <span className="font-medium">{formatPrice(service.price)}</span>
                        <span className="text-muted-foreground">
                          {service.createdAt
                            ? format(new Date(service.createdAt), 'dd/MM/yy')
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
                })}
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ServiceDetailsModal
        service={selectedService}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusUpdate}
      />
    </div>
  );
}
