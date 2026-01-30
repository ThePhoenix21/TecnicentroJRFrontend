'use client';

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { Pencil, Info } from 'lucide-react';
import { format } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { clientService, Client } from '@/services/client.service';
import { ClientDetailsModal } from '@/components/modals/ClientDetailsModal';
import { EditClientModal } from '@/components/modals/EditClientModal';
import { Skeleton } from '@/components/ui/skeleton';
import { uniqueBy } from '@/utils/array';

import type {
  ClientFilters,
  ClientListItem,
  ClientLookupDniItem,
  ClientLookupNameItem,
  ClientLookupPhoneItem,
} from '@/types/client.types';

const toUtcRange = (from: string, to: string) => {
  const fromDate = `${from}T00:00:00.000Z`;
  const toDate = `${to}T23:59:59.999Z`;
  return { fromDate, toDate };
};

function ClientesContent() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [nameFilter, setNameFilter] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [dniFilter, setDniFilter] = useState('');
  const [dniQuery, setDniQuery] = useState('');
  const [showDniSuggestions, setShowDniSuggestions] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [nameLookup, setNameLookup] = useState<ClientLookupNameItem[]>([]);
  const [phoneLookup, setPhoneLookup] = useState<ClientLookupPhoneItem[]>([]);
  const [dniLookup, setDniLookup] = useState<ClientLookupDniItem[]>([]);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const loadClientsRef = useRef<(() => Promise<void>) | null>(null);
  const didMountRef = useRef(false);
  const lastClientsRequestKeyRef = useRef<string | null>(null);
  const clientsRequestInFlightRef = useRef<Promise<void> | null>(null);

  const openDetails = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsDetailsOpen(true);
  };

  const handleEditClient = async (clientId: string) => {
    try {
      const full = await clientService.getClientById(clientId);
      setEditingClient(full);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error loading client detail:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el detalle del cliente.',
        variant: 'destructive',
      });
    }
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === updatedClient.id
          ? {
              ...client,
              name: updatedClient.name ?? client.name,
              email: updatedClient.email ?? client.email,
              phone: updatedClient.phone ?? client.phone,
              dni: updatedClient.dni ?? client.dni,
            }
          : client
      )
    );
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  const loadClients = useCallback(async () => {
    const dateRange = fromDate && toDate ? toUtcRange(fromDate, toDate) : null;
    const filters: ClientFilters = {
      name: nameFilter.trim() || undefined,
      phone: phoneFilter.trim() || undefined,
      dni: dniFilter.trim() || undefined,
      fromDate: dateRange?.fromDate,
      toDate: dateRange?.toDate,
    };

    const requestKey = JSON.stringify({ page, pageSize, filters });
    if (clientsRequestInFlightRef.current && lastClientsRequestKeyRef.current === requestKey) {
      return;
    }

    try {
      setLoading(true);

      lastClientsRequestKeyRef.current = requestKey;
      const requestPromise = clientService.getClients(page, pageSize, filters);
      clientsRequestInFlightRef.current = requestPromise.then(() => undefined);

      const response = await requestPromise;
      setClients(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total ?? 0);
      setTotalPages(response.totalPages ?? 1);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes. Por favor, intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      clientsRequestInFlightRef.current = null;
    }
  }, [dniFilter, fromDate, nameFilter, page, pageSize, phoneFilter, toDate, toast]);

  loadClientsRef.current = loadClients;

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [names, phones, dnis] = await Promise.all([
          clientService.getLookupName(),
          clientService.getLookupPhone(),
          clientService.getLookupDni(),
        ]);
        const safeNames = Array.isArray(names)
          ? uniqueBy(names, (item) => item.name?.trim().toLowerCase())
          : [];
        const safePhones = Array.isArray(phones)
          ? uniqueBy(phones, (item) => item.phone?.trim())
          : [];
        const safeDnis = Array.isArray(dnis)
          ? uniqueBy(dnis, (item) => item.dni?.trim())
          : [];
        setNameLookup(safeNames);
        setPhoneLookup(safePhones);
        setDniLookup(safeDnis);
      } catch (error) {
        console.error('Error loading client lookups:', error);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadClients();
    }, 400);

    return () => clearTimeout(timeout);
  }, [nameFilter, phoneFilter, dniFilter, fromDate, toDate, loadClients]);

  const filteredNameSuggestions = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return nameLookup.slice(0, 8);
    return nameLookup.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
  }, [nameQuery, nameLookup]);

  const filteredPhoneSuggestions = useMemo(() => {
    const q = phoneQuery.trim().toLowerCase();
    if (!q) return phoneLookup.slice(0, 8);
    return phoneLookup.filter((item) => String(item.phone ?? '').toLowerCase().includes(q)).slice(0, 8);
  }, [phoneQuery, phoneLookup]);

  const filteredDniSuggestions = useMemo(() => {
    const q = dniQuery.trim().toLowerCase();
    if (!q) return dniLookup.slice(0, 8);
    return dniLookup.filter((item) => String(item.dni ?? '').toLowerCase().includes(q)).slice(0, 8);
  }, [dniQuery, dniLookup]);

  const handlePageChange = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
    loadClients();
  };

  const handleDeleted = () => {
    toast({
      title: 'Cliente borrado',
      description: 'El cliente fue borrado correctamente.',
    });
    loadClients();
  };

  return (
    <div className="space-y-6 p-2 sm:p-4 pb-20 sm:pb-6">
      <PageHeader
        title="Clientes"
        description="Administra la información de tus clientes"
        className="px-0 sm:px-0"
      >
      </PageHeader>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">Lista de Clientes</CardTitle>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Input
                  placeholder="Nombre..."
                  value={nameQuery}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setNameFilter('');
                    setShowNameSuggestions(true);
                  }}
                />
                {showNameSuggestions && filteredNameSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                    {filteredNameSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNameFilter(item.name);
                          setNameQuery(item.name);
                          setShowNameSuggestions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  placeholder="Teléfono..."
                  value={phoneQuery}
                  onFocus={() => setShowPhoneSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 150)}
                  onChange={(e) => {
                    setPhoneQuery(e.target.value);
                    setPhoneFilter('');
                    setShowPhoneSuggestions(true);
                  }}
                />
                {showPhoneSuggestions && filteredPhoneSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                    {filteredPhoneSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPhoneFilter(item.phone);
                          setPhoneQuery(item.phone);
                          setShowPhoneSuggestions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {item.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  placeholder="DNI..."
                  value={dniQuery}
                  onFocus={() => setShowDniSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDniSuggestions(false), 150)}
                  onChange={(e) => {
                    setDniQuery(e.target.value);
                    setDniFilter('');
                    setShowDniSuggestions(true);
                  }}
                />
                {showDniSuggestions && filteredDniSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                    {filteredDniSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDniFilter(item.dni);
                          setDniQuery(item.dni);
                          setShowDniSuggestions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {item.dni}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2 pt-2 border-t border-muted/60">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Desde</span><br />
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full sm:w-[180px]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Hasta</span><br />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full sm:w-[180px]" />
              </div>
              {(nameFilter || phoneFilter || dniFilter || fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNameQuery('');
                    setNameFilter('');
                    setPhoneQuery('');
                    setPhoneFilter('');
                    setDniQuery('');
                    setDniFilter('');
                    setFromDate('');
                    setToDate('');
                    setPage(1);
                  }}
                  className="h-9"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {nameFilter || phoneFilter || dniFilter || fromDate || toDate
                ? "No se encontraron clientes que coincidan con el filtro"
                : "No se encontraron clientes"
              }
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-4 pt-4">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando {clients.length} de {total} clientes
                  {totalPages > 1 && ` · página ${page} de ${totalPages}`}
                </span>
              </div>
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="hidden md:block">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Historial</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead className="w-[120px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow
                          key={client.id}
                          className="hover:bg-accent/50 cursor-pointer"
                          onClick={() => openDetails(client.id)}
                        >
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.email && <div className="text-sm">{client.email}</div>}
                              {client.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.dni && <div className="text-sm">DNI: {client.dni}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-sm">
                              <div>Ventas: <span className="font-semibold">{client.salesCount ?? 0}</span></div>
                              <div className="text-destructive">
                                Canceladas: <span className="font-semibold">{client.cancelledCount ?? 0}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClient(client.id);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Vista de tarjetas para móviles */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow"
                    onClick={() => openDetails(client.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{client.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground space-y-1">
                            {client.email && <div>{client.email}</div>}
                            {client.phone && <div>{client.phone}</div>}
                            {client.dni && <div>DNI: {client.dni}</div>}
                          </div>
                        </div>
                        <div className="text-right text-xs space-y-0.5">
                          <div>
                            Ventas: <span className="font-semibold">{client.salesCount ?? 0}</span>
                          </div>
                          <div className="text-destructive">
                            Canceladas: <span className="font-semibold">{client.cancelledCount ?? 0}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client.id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {(client.email || client.phone) && (
                        <div className="mt-3 space-y-1 text-sm">
                          {client.email && (
                            <div className="flex items-center">
                              <span className="text-muted-foreground w-16">Email:</span>
                              <a 
                                href={`mailto:${client.email}`} 
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {client.email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center">
                              <span className="text-muted-foreground w-16">Tel:</span>
                              <a 
                                href={`tel:${client.phone}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {client.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                          Registro: {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yy') : 'N/A'}
                        </span>
                        <div className="flex justify-between text-xs">
                          <span>Ventas: <span className="font-semibold">{client.salesCount ?? 0}</span></span>
                          <span className="text-destructive">
                            Canceladas: <span className="font-semibold">{client.cancelledCount ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="h-8"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="h-8"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={editingClient}
        onClientUpdated={handleClientUpdated}
      />

      <ClientDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        clientId={selectedClientId}
        onEdit={(client) => {
          setEditingClient(client);
          setIsEditModalOpen(true);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    }>
      <ClientesContent />
    </Suspense>
  );
}
