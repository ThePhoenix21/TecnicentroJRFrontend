"use client";

import { useState, useEffect, useMemo } from "react";
import { storeService } from "@/services/store.service";
import { tenantService } from "@/services/tenant.service";
import { type Store } from "@/types/store";
import { StoreForm } from "./store-form";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Edit2, MapPin, Phone, Building, Mail } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import { authService } from "@/services/auth";

interface TenantTokenPayload {
  tenantLogoUrl?: string;
}

export default function TiendasPage() {
    const { isAdmin, refreshStores } = useAuth();
    const { canManageStores, canChangeStoreLogo } = usePermissions();
    const canManage = isAdmin || canManageStores();
    const canManageLogo = isAdmin || canChangeStoreLogo();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [tokenLogoUrl, setTokenLogoUrl] = useState<string | null>(null);

    const allowedLogoMimeTypes = useMemo(() => {
      return new Set([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]);
    }, []);

    const loadLogoFromToken = () => {
      if (typeof window === 'undefined') return;
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setTokenLogoUrl(null);
          return;
        }
        const decoded = jwtDecode<TenantTokenPayload>(token);
        setTokenLogoUrl(decoded.tenantLogoUrl || null);
      } catch {
        setTokenLogoUrl(null);
      }
    };

    const loadStores = async () => {
    try {
        setLoading(true);
        const data = await storeService.getAllStores();
        setStores(data);
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar las tiendas");
    } finally {
        setLoading(false);
    }
    };

    useEffect(() => {
    loadStores();
    }, []);

    useEffect(() => {
      loadLogoFromToken();
    }, []);

    useEffect(() => {
      return () => {
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
        }
      };
    }, [logoPreviewUrl]);

    useEffect(() => {
      if (!isLogoModalOpen) {
        handleSelectLogoFile(null);
      }
    }, [isLogoModalOpen]);

    const handleSelectLogoFile = (file: File | null) => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }

      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);

      if (!file) return;

      if (!allowedLogoMimeTypes.has(file.type)) {
        toast.error('Formato inválido. Solo se permite: jpg, jpeg, png, gif, webp');
        return;
      }

      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error('El archivo supera el tamaño máximo de 5MB');
        return;
      }

      setSelectedLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadLogo = async () => {
      if (!selectedLogoFile) {
        toast.error('Selecciona un archivo primero');
        return;
      }

      const confirmed = window.confirm('Este cambio actualizará el logo del tenant y tendrás que iniciar sesión nuevamente. ¿Deseas continuar?');
      if (!confirmed) {
        return;
      }

      try {
        setIsUploadingLogo(true);
        await tenantService.updateLogo(selectedLogoFile);

        toast.success('Logo actualizado correctamente. Serás redirigido para iniciar sesión nuevamente.');
        setSelectedLogoFile(null);
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
        }
        setLogoPreviewUrl(null);

        authService.logout();
        return;
      } catch (error) {
        console.error('Error al actualizar el logo del tenant:', error);
        toast.error(error instanceof Error ? error.message : 'Error al actualizar el logo');
      } finally {
        setIsUploadingLogo(false);
      }
    };

    const handleCreateStore = () => {
        if (!canManage) return;
        setEditingStore(null);
        setIsFormOpen(true);
    };

    const handleEditStore = (store: Store) => {
        if (!canManage) return;
        setEditingStore(store);
        setIsFormOpen(true);
    };

    const handleStoreSaved = () => {
        setIsFormOpen(false);
        setEditingStore(null);
        loadStores();
        refreshStores();
    };

    const filteredStores = stores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.createdBy?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div
                  role="button"
                  aria-disabled={!canManageLogo}
                  onClick={canManageLogo ? () => setIsLogoModalOpen(true) : undefined}
                  className={`mb-2 inline-flex h-40 w-40 items-center justify-center rounded-md border bg-muted/30 p-2 ${
                    canManageLogo ? 'cursor-pointer hover:border-primary/50 hover:bg-muted/50' : 'cursor-default opacity-90'
                  }`}
                >
                  {tokenLogoUrl ? (
                    <img src={tokenLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Logo</span>
                  )}
                </div>
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Tiendas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestiona las tiendas del sistema
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {canManage && (
                  <Button 
                    onClick={handleCreateStore}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="font-medium">Nueva Tienda</span>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="w-full">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tiendas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          {canManageLogo && (
            <Dialog open={isLogoModalOpen} onOpenChange={setIsLogoModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Logo de la empresa</DialogTitle>
                </DialogHeader>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Este logo se usa en PDFs y comprobantes.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div className="flex items-center justify-center rounded-md border bg-muted/30 p-3">
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Logo preview" className="max-h-24 w-auto object-contain" />
                      ) : tokenLogoUrl ? (
                        <img src={tokenLogoUrl} alt="Logo actual" className="max-h-24 w-auto object-contain" />
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin logo</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => handleSelectLogoFile(e.target.files?.[0] || null)}
                        disabled={isUploadingLogo}
                      />

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={handleUploadLogo}
                          disabled={!selectedLogoFile || isUploadingLogo}
                          size="sm"
                        >
                          {isUploadingLogo ? 'Subiendo...' : 'Guardar logo'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectLogoFile(null)}
                          disabled={isUploadingLogo && !selectedLogoFile}
                        >
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "No se encontraron tiendas que coincidan con la búsqueda" : "No hay tiendas registradas"}
              </p>
              {!searchTerm && canManage && (
                <Button onClick={handleCreateStore} className="mt-4">
                  Crear primera tienda
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Fecha de creación</TableHead>
                      {canManage && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>
                          {store.address ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {store.address}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin dirección</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {store.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin teléfono</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.createdBy ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{store.createdBy.name}</div>
                                <div className="text-sm text-gray-500">{store.createdBy.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Desconocido</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(store.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStore(store)}
                              className="flex items-center gap-1"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <StoreForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingStore(null);
          }}
          onStoreSaved={handleStoreSaved}
          editingStore={editingStore}
        />
      )}
    </div>
  );
}
