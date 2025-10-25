'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, X, Info } from 'lucide-react';
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
import { clientService } from '@/services/client.service';
import { Client } from '@/types/client.types';
import { EditClientModal } from '@/components/modals/EditClientModal';
import { Skeleton } from '@/components/ui/skeleton';

function ClientesContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(clients.map(client =>
      client.id === updatedClient.id ? updatedClient : client
    ));
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientService.getClients(1, 100); // Cargar todos para filtrar localmente
      setClients(response.data);
      setFilteredClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes. Por favor, intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter((client) =>
        client.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ruc?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6 p-2 sm:p-4 pb-20 sm:pb-6">
      <PageHeader
        title="Clientes"
        description="Administra la información de tus clientes"
        className="px-0 sm:px-0"
      >
        <Button 
          onClick={() => router.push('/dashboard/clientes/nuevo')} 
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> 
          <span className="hidden sm:inline">Nuevo Cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">Lista de Clientes</CardTitle>
            <form onSubmit={handleSearch} className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por ID, nombre, email, teléfono, DNI o RUC..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        loadClients();
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
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm.trim()
                ? `No se encontraron clientes que coincidan con "${searchTerm}"`
                : "No se encontraron clientes"
              }
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-4 pt-4">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando {filteredClients.length} de {clients.length} clientes
                  {searchTerm.trim() && ` (filtrados por "${searchTerm}")`}
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
                        <TableHead>Registro</TableHead>
                        <TableHead className="w-[120px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-accent/50">
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.email && <div className="text-sm">{client.email}</div>}
                              {client.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.dni && <div className="text-sm">DNI: {client.dni}</div>}
                            {client.ruc && <div className="text-sm">RUC: {client.ruc}</div>}
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
                                  handleEditClient(client);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('¿Está seguro de eliminar este cliente?')) {
                                    try {
                                      await clientService.deleteClient(client.id);
                                      toast({
                                        title: 'Cliente eliminado',
                                        description: 'El cliente ha sido eliminado correctamente.',
                                      });
                                      loadClients();
                                    } catch (error) {
                                      console.error('Error deleting client:', error);
                                      toast({
                                        title: 'Error',
                                        description: 'No se pudo eliminar el cliente. Por favor, intente nuevamente.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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
                {filteredClients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {client.dni && <span>DNI: {client.dni}</span>}
                            {client.ruc && <span className="ml-2">RUC: {client.ruc}</span>}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client);
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
                      
                      <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Registro: {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yy') : 'N/A'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar este cliente?')) {
                              try {
                                await clientService.deleteClient(client.id);
                                toast({
                                  title: 'Cliente eliminado',
                                  description: 'El cliente ha sido eliminado correctamente.',
                                });
                                loadClients();
                              } catch (error) {
                                console.error('Error deleting client:', error);
                                toast({
                                  title: 'Error',
                                  description: 'No se pudo eliminar el cliente. Intente nuevamente.',
                                  variant: 'destructive',
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
