"use client";

import { useCallback, useEffect, useState } from "react";
import { serviceService, Service } from "@/services/service.service";
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
import { ServiceDetailsModal } from "@/components/service/ServiceDetailsModal";

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadServices = useCallback(async (search: string = "") => {
    try {
      setLoading(true);
      const data = await serviceService.getServicesWithClients(
        undefined,
        search
      );
      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Filtro local para búsqueda en tiempo real
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredServices(services);
    } else {
      const filtered = services.filter((service) =>
        service.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    }
  }, [searchTerm, services]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadServices(searchTerm);
  };

  const handleStatusUpdate = () => {
    loadServices(searchTerm);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  

  const getStatusBadge = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const translateStatus = (status?: string) => {
    if (!status) return "No especificado";

    const statusMap: Record<string, string> = {
      COMPLETED: "Completado",
      IN_PROGRESS: "En Progreso",
      PENDING: "Pendiente",
      CANCELLED: "Cancelado",
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
                        loadServices('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  Buscar
                </Button>
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm.trim()
                ? `No se encontraron servicios que coincidan con "${searchTerm}"`
                : "No se encontraron servicios registrados"
              }
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-4 pt-4">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando {filteredServices.length} de {services.length} servicios
                  {searchTerm.trim() && ` (filtrados por "${searchTerm}")`}
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
                      {filteredServices.map((service) => (
                        <TableRow
                          key={service.id}
                          className="cursor-pointer hover:bg-accent/50"
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
                            <div className="text-sm text-muted-foreground truncate">
                              {service.description || "Sin descripción"}
                            </div>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Vista de tarjetas para móviles */}
              <div className="md:hidden space-y-3">
                {filteredServices.map((service) => (
                  <Card 
                    key={service.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
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
                ))}
              </div>
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
