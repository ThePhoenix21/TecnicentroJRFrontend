'use client';

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { Pencil, Info } from 'lucide-react';
import { format } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActiveFilters } from '@/components/ui/active-filters';
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
import { useAuth } from '@/contexts/auth-context';

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
  const { isAdmin, hasPermission } = useAuth();
  const canManageClients = isAdmin || hasPermission?.('MANAGE_CLIENTS');
  const canViewClients = canManageClients || isAdmin || hasPermission?.('VIEW_CLIENTS');

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
    if (!canManageClients) return;
    setSelectedClientId(clientId);
    setIsDetailsOpen(true);
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

  const clearFilters = () => {
    setNameQuery('');
    setNameFilter('');
    setPhoneQuery('');
    setPhoneFilter('');
    setDniQuery('');
    setDniFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground invisible">Nombre</span>
                <div className="relative">
                  <Input
                    placeholder="Nombre..."
                    value={nameQuery}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setNameQuery(nextValue);
                      setShowNameSuggestions(nextValue.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const trimmed = nameQuery.trim();
                      if (!trimmed) return;
                      setNameFilter(trimmed);
                      setNameQuery(trimmed);
                      setShowNameSuggestions(false);
                    }}
                    className="text-sm"
                  />
                  {showNameSuggestions && nameQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredNameSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                      ) : (
                        filteredNameSuggestions.map((item) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground invisible">Teléfono</span>
                <div className="relative">
                  <Input
                    placeholder="Teléfono..."
                    value={phoneQuery}
                    onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 150)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setPhoneQuery(nextValue);
                      setShowPhoneSuggestions(nextValue.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const trimmed = phoneQuery.trim();
                      if (!trimmed) return;
                      setPhoneFilter(trimmed);
                      setPhoneQuery(trimmed);
                      setShowPhoneSuggestions(false);
                    }}
                    className="text-sm"
                  />
                  {showPhoneSuggestions && phoneQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredPhoneSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                      ) : (
                        filteredPhoneSuggestions.map((item) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground invisible">DNI</span>
                <div className="relative">
                  <Input
                    placeholder="DNI..."
                    value={dniQuery}
                    onBlur={() => setTimeout(() => setShowDniSuggestions(false), 150)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDniQuery(nextValue);
                      setShowDniSuggestions(nextValue.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const trimmed = dniQuery.trim();
                      if (!trimmed) return;
                      setDniFilter(trimmed);
                      setDniQuery(trimmed);
                      setShowDniSuggestions(false);
                    }}
                    className="text-sm"
                  />
                  {showDniSuggestions && dniQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredDniSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                      ) : (
                        filteredDniSuggestions.map((item) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Desde</span>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => setFromDate(e.target.value)} 
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                <Input 
                  type="date" 
                  value={toDate} 
                  onClick={(e) => e.currentTarget.showPicker?.()} 
                  onChange={(e) => setToDate(e.target.value)} 
                  className="text-sm h-9"
                />
              </div>
            </div>

            <ActiveFilters 
              hasActiveFilters={!!(nameFilter || phoneFilter || dniFilter || fromDate || toDate)}
              onClearFilters={clearFilters}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0 sm:p-4">
          {!canViewClients ? (
            <div className="text-center py-12 text-muted-foreground">
              No tienes permisos para ver esta sección.
            </div>
          ) : loading ? (
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
              {/* Vista de tabla para todas las pantallas con columnas ocultas en móviles */}
              <div className="rounded-md border overflow-hidden">
                <Table className="[&_td]:py-2 [&_th]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px] text-xs">Nombre</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">Contacto</TableHead>
                      <TableHead className="min-w-[110px] text-xs">Documento</TableHead>
                      {/* Hide Historial and Registro in mobile */}
                      <TableHead className="hidden md:table-cell text-xs">Historial</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow
                        key={client.id}
                        className={`h-12 ${canManageClients ? 'hover:bg-accent/50 cursor-pointer' : undefined}`}
                        onClick={canManageClients ? () => openDetails(client.id) : undefined}
                      >
                        <TableCell className="font-medium text-[11px] px-3">{client.name}</TableCell>
                        <TableCell className="hidden sm:table-cell px-3">
                          <div className="space-y-0.5">
                            {client.email && <div className="text-[11px]">{client.email}</div>}
                            {client.phone && <div className="text-[11px] text-muted-foreground">{client.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] px-3">
                          {client.dni && <div className="text-[11px]">DNI: {client.dni}</div>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-3">
                          <div className="space-y-0.5 text-xs">
                            <div>Ventas: <span className="font-semibold">{client.salesCount ?? 0}</span></div>
                            <div className="text-destructive">
                              Anuladas: <span className="font-semibold">{client.cancelledCount ?? 0}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell whitespace-nowrap px-3 text-xs">
                          {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yy') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        canManageClients={canManageClients}
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
