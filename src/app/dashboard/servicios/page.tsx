"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uniqueBy } from "@/utils/array";
import { serviceService, ServiceStatus, type ServiceListItem, type ServiceLookupItem } from "@/services/service.service";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServiceDetailsModal from "@/components/service/ServiceDetailsModal";
import { useAuth } from "@/contexts/auth-context";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { clientService } from "@/services/client.service";
import type { ClientLookupNameItem } from "@/types/client.types";
import { Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function ServiciosPage() {
  const { currentStore, hasPermission, isAdmin } = useAuth();
  const canViewServices = isAdmin || hasPermission?.("VIEW_SERVICES") || hasPermission?.("MANAGE_SERVICES");
  const PAGE_SIZE = 12;

  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clientLookup, setClientLookup] = useState<ClientLookupNameItem[]>([]);
  const [serviceLookup, setServiceLookup] = useState<ServiceLookupItem[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: string; value: string } | null>(null);

  const filteredClientLookup = useMemo(() => {
    const query = clientSearchTerm.trim().toLowerCase();
    if (!query) return [];
    return clientLookup.filter((c) => c.name?.toLowerCase().includes(query));
  }, [clientLookup, clientSearchTerm]);

  const filteredServiceLookup = useMemo(() => {
    const query = serviceSearchTerm.trim().toLowerCase();
    if (!query) return [];
    return serviceLookup.filter((s) => s.value?.toLowerCase().includes(query));
  }, [serviceLookup, serviceSearchTerm]);

  const [clientIdFilter, setClientIdFilter] = useState<string>("all");
  const [serviceIdFilter, setServiceIdFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "all">("all");
  const [openCashOnly, setOpenCashOnly] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtersKey = useMemo(
    () => [clientIdFilter, serviceIdFilter, statusFilter, openCashOnly, fromDate, toDate].join("|"),
    [clientIdFilter, serviceIdFilter, statusFilter, openCashOnly, fromDate, toDate]
  );

  const requestSeq = useRef(0);
  const lastStoreIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.client-search-container')) {
        setShowClientDropdown(false);
      }
      if (!target.closest('.service-search-container')) {
        setShowServiceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadServices = useCallback(
    async (targetPage = 1, opts?: { clear?: boolean }) => {
      if (!currentStore || !canViewServices) {
        setServices([]);
        setTotal(0);
        setTotalPages(1);
        setPage(1);
        setLoading(false);
        setError(null);
        return;
      }

      const currentRequest = ++requestSeq.current;

      if (opts?.clear) {
        setServices([]);
        setTotal(0);
        setTotalPages(1);
      }

      try {
        setLoading(true);
        setError(null);

        const response = await serviceService.getServicesPaged({
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
          openCashOnly,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          clientId: clientIdFilter === "all" ? undefined : clientIdFilter,
          serviceId: serviceIdFilter === "all" ? undefined : serviceIdFilter,
          storeId: currentStore?.id,
        });

        if (currentRequest !== requestSeq.current) return;

        setServices(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setPage(response.page || targetPage);
      } catch (e: unknown) {
        if (currentRequest !== requestSeq.current) return;
        const message = e instanceof Error ? e.message : "No se pudieron cargar los servicios.";
        setError(message);
        setServices([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (currentRequest !== requestSeq.current) return;
        setLoading(false);
      }
    },
    [
      PAGE_SIZE,
      canViewServices,
      clientIdFilter,
      currentStore,
      fromDate,
      openCashOnly,
      serviceIdFilter,
      statusFilter,
      toDate,
    ]
  );

  useEffect(() => {
    const storeId = currentStore?.id ?? null;

    if (lastStoreIdRef.current && lastStoreIdRef.current !== storeId) {
      setClientIdFilter("all");
      setServiceIdFilter("all");
      setStatusFilter("all");
      setOpenCashOnly(false);
      setFromDate("");
      setToDate("");
      setPage(1);
      setServices([]);
      setTotal(0);
      setTotalPages(1);
      setSelectedServiceId(null);
      setIsModalOpen(false);
      setError(null);
    }

    lastStoreIdRef.current = storeId;
  }, [currentStore?.id]);

  useEffect(() => {
    const loadLookups = async () => {
      if (!canViewServices) return;
      try {
        const [clients, servicesLookup] = await Promise.all([
          clientService.getLookupName(),
          serviceService.getServicesLookup(),
        ]);

        const safeClients = Array.isArray(clients)
          ? uniqueBy(clients, (c) => c.name?.trim().toLowerCase())
          : [];
        const safeServices = Array.isArray(servicesLookup)
          ? uniqueBy(servicesLookup, (s) => `${s.id}-${s.value?.trim().toLowerCase()}`)
          : [];

        setClientLookup(safeClients);
        setServiceLookup(safeServices);
      } catch {
        setClientLookup([]);
        setServiceLookup([]);
      }
    };

    loadLookups();
  }, [canViewServices]);

  useEffect(() => {
    if (!currentStore || !canViewServices) return;

    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      loadServices(1, { clear: true });
      return;
    }

    const timeout = setTimeout(() => {
      setPage(1);
      loadServices(1, { clear: true });
    }, 500);

    return () => clearTimeout(timeout);
  }, [filtersKey, currentStore?.id, canViewServices, loadServices]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    loadServices(nextPage);
  };

  const openDetail = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status?: ServiceStatus, pendingPayment?: boolean) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status) {
      case ServiceStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case ServiceStatus.IN_PROGRESS:
      return "bg-orange-300 text-orange-900 font-bold";

      case ServiceStatus.COMPLETED:
      return pendingPayment ? "bg-orange-500 text-white font-bold" : "bg-green-600 text-white font-bold";
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

  const formatPrice = (price?: number | string | null) => {
    if (price === undefined || price === null) return "S/0.00";
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "S/0.00";
    return `S/${numPrice.toFixed(2)}`;  
  };

  const clearFilters = () => {
    setClientSearchTerm("");
    setServiceSearchTerm("");
    setSelectedClient(null);
    setSelectedService(null);
    setClientIdFilter("all");
    setServiceIdFilter("all");
    setStatusFilter("all");
    setOpenCashOnly(true);
    setFromDate("");
    setToDate("");
    setShowClientDropdown(false);
    setShowServiceDropdown(false);
    setPage(1);
    loadServices(1, { clear: true });
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
            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Limpiar filtros
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="relative client-search-container min-w-[220px]">
              <Label className="text-sm font-medium text-gray-700 mb-1 block opacity-0">
                Cliente
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cliente"
                  className="pl-10 pr-10 h-9 text-sm"
                  value={clientSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClientSearchTerm(value);
                    setSelectedClient(null);
                    if (value.trim()) {
                      setShowClientDropdown(true);
                    } else {
                      setShowClientDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (clientSearchTerm.trim()) {
                      setShowClientDropdown(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const match = filteredClientLookup[0];
                      if (match) {
                        setClientSearchTerm(match.name);
                        setSelectedClient({ id: match.id, name: match.name });
                        setClientIdFilter(match.id);
                      }
                      setShowClientDropdown(false);
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setShowClientDropdown(false);
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  disabled={loading}
                />
                {(clientSearchTerm || selectedClient) && (
                  <button
                    onClick={() => {
                      setClientSearchTerm("");
                      setSelectedClient(null);
                      setClientIdFilter("all");
                      setShowClientDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showClientDropdown && clientSearchTerm.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer border-b"
                    onClick={() => {
                      setClientSearchTerm("");
                      setSelectedClient(null);
                      setClientIdFilter("all");
                      setShowClientDropdown(false);
                    }}
                  >
                    Todos los clientes
                  </div>
                  {filteredClientLookup.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</div>
                  ) : (
                    filteredClientLookup.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setClientSearchTerm(c.name);
                          setSelectedClient({ id: c.id, name: c.name });
                          setClientIdFilter(c.id);
                          setShowClientDropdown(false);
                        }}
                      >
                        {c.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative service-search-container min-w-[220px]">
              <Label className="text-sm font-medium text-gray-700 mb-1 block opacity-0">
                Servicio
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Servicio"
                  className="pl-10 pr-10 h-9 text-sm"
                  value={serviceSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setServiceSearchTerm(value);
                    setSelectedService(null);
                    if (value.trim()) {
                      setShowServiceDropdown(true);
                    } else {
                      setShowServiceDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (serviceSearchTerm.trim()) {
                      setShowServiceDropdown(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const match = filteredServiceLookup[0];
                      if (match) {
                        setServiceSearchTerm(match.value);
                        setSelectedService({ id: match.id, value: match.value });
                        setServiceIdFilter(match.id);
                      }
                      setShowServiceDropdown(false);
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setShowServiceDropdown(false);
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  disabled={loading}
                />
                {(serviceSearchTerm || selectedService) && (
                  <button
                    onClick={() => {
                      setServiceSearchTerm("");
                      setSelectedService(null);
                      setServiceIdFilter("all");
                      setShowServiceDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showServiceDropdown && serviceSearchTerm.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer border-b"
                    onClick={() => {
                      setServiceSearchTerm("");
                      setSelectedService(null);
                      setServiceIdFilter("all");
                      setShowServiceDropdown(false);
                    }}
                  >
                    Todos los servicios
                  </div>
                  {filteredServiceLookup.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</div>
                  ) : (
                    filteredServiceLookup.map((s) => (
                      <div
                        key={s.id}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setServiceSearchTerm(s.value);
                          setSelectedService({ id: s.id, value: s.value });
                          setServiceIdFilter(s.id);
                          setShowServiceDropdown(false);
                        }}
                      >
                        {s.value}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="min-w-[170px]">
              <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mb-1 block">
                Estado
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ServiceStatus | "all")}
                disabled={loading}
              >
                <SelectTrigger className="w-full h-9 text-sm" id="status-filter">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={ServiceStatus.IN_PROGRESS}>En Progreso</SelectItem>
                  <SelectItem value={ServiceStatus.COMPLETED}>Completado</SelectItem>
                  <SelectItem value={ServiceStatus.DELIVERED}>Entregado</SelectItem>
                  <SelectItem value={ServiceStatus.PAID}>Pagado</SelectItem>
                  <SelectItem value={ServiceStatus.ANNULLATED}>Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label htmlFor="from-date" className="text-sm font-medium text-gray-700 mb-1 block">
                Desde
              </Label>
              <Input
                id="from-date"
                type="date"
                className="h-9 text-sm"
                  value={fromDate}
                  onClick={(e) => e.currentTarget.showPicker?.()}                
                onChange={(e) => setFromDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="min-w-[150px]">
              <Label htmlFor="to-date" className="text-sm font-medium text-gray-700 mb-1 block">
                Hasta
              </Label>
              <Input
                id="to-date"
                type="date"
                className="h-9 text-sm"
                value={toDate}
                onClick={(e) => e.currentTarget.showPicker?.()}                
                onChange={(e) => setToDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="basis-full" />

            <div className="min-w-[140px] flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Checkbox
                id="open-cash-only"
                checked={openCashOnly}
                onCheckedChange={(checked) => setOpenCashOnly(Boolean(checked))}
                disabled={loading}
              />
              <label htmlFor="open-cash-only" className="cursor-pointer select-none">
                Solo caja abierta
              </label>
            </div>
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
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              {error}
            </div>
          ) : loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron servicios
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-4 pt-4">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando {services.length} de {total} servicios
                  {currentStore && ` en "${currentStore.name}"`}
                </span>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow
                        key={service.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => openDetail(service.id)}
                      >
                        <TableCell className="max-w-[180px] truncate">{service.clientName}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          <div className="font-medium">{service.serviceName}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(service.status)}`}>
                            {translateStatus(service.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(service.price)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {service.createdAt ? format(new Date(service.createdAt), "dd/MM/yy") : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {page} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
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
        serviceId={selectedServiceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={() => loadServices(page)}
      />
    </div>
  );
}
