'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, Warehouse as WarehouseIcon, Pencil, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { warehouseService } from '@/services/warehouse.service';
import type {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseDetail,
  WarehouseListItem,
} from '@/types/warehouse.types';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();

export default function WarehousesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateWarehouseDto>({
    name: '',
    address: '',
    phone: '',
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<WarehouseDetail | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<UpdateWarehouseDto>({
    name: '',
    address: '',
    phone: '',
  });

  const [isEditingStores, setIsEditingStores] = useState(false);
  const [editStoresSubmitting, setEditStoresSubmitting] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [storesLookup, setStoresLookup] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [storesLookupLoading, setStoresLookupLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [localWarehouseStores, setLocalWarehouseStores] = useState<Array<{ id: string; store: { id: string; name: string; address: string } }>>([]);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getWarehouses();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'No se pudieron cargar los almacenes'
      );
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWarehouses();
    // Cargar tiendas disponibles para el selector de edición
    const loadStores = async () => {
      try {
        console.log('🔍 Cargando tiendas disponibles desde /store/simple...');
        const stores = await warehouseService.getStoresSimple();
        console.log('📦 Tiendas disponibles recibidas:', stores);
        setAvailableStores(stores);
      } catch (error) {
        console.error('❌ Error cargando tiendas:', error);
      }
    };
    loadStores();
  }, [loadWarehouses]);

  const filteredWarehouses = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return warehouses;

    return warehouses.filter((w) => {
      return (
        normalize(w.name).includes(q) ||
        normalize(w.address).includes(q) ||
        normalize(w.phone).includes(q)
      );
    });
  }, [warehouses, searchTerm]);

  const openCreate = () => {
    setIsCreateOpen(true);
    setCreateSubmitting(false);
    setCreateForm({ name: '', address: '', phone: '' });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateSubmitting(false);
  };

  const submitCreate = async () => {
    const dto: CreateWarehouseDto = {
      name: createForm.name?.trim(),
      address: createForm.address?.trim(),
      phone: createForm.phone?.trim(),
    };

    if (!dto.name || !dto.address || !dto.phone) {
      toast.error('Complete nombre, dirección y teléfono');
      return;
    }

    try {
      setCreateSubmitting(true);
      const created = await warehouseService.createWarehouse(dto);
      toast.success('Almacén creado');
      closeCreate();
      setWarehouses((prev) => [created, ...prev]);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }

      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }

      if (status === 409) {
        toast.error('Ya existe un almacén con esos datos.');
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || 'Error al crear almacén');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedWarehouseId(null);
    setDetail(null);
    setDetailLoading(false);
    setIsEditing(false);
    setIsEditingStores(false);
    setEditSubmitting(false);
    setEditStoresSubmitting(false);
    setDeleteSubmitting(false);
    setEditForm({ name: '', address: '', phone: '' });
    setSelectedStoreIds([]);
    setLocalWarehouseStores([]);
    setSelectedStoreId('');
  };

  const openDetail = async (warehouseId: string) => {
    setIsDetailOpen(true);
    setSelectedWarehouseId(warehouseId);
    setDetail(null);
    setIsEditing(false);
    setIsEditingStores(false);
    setEditSubmitting(false);
    setEditStoresSubmitting(false);
    setDeleteSubmitting(false);

    try {
      setDetailLoading(true);
      const d = await warehouseService.getWarehouseById(warehouseId);
      setDetail(d);
      setEditForm({
        name: d.name ?? '',
        address: d.address ?? '',
        phone: d.phone ?? '',
      });
      // Inicializar IDs de tiendas asociadas y estado local
      const storeIds = d.warehouseStores?.map((ws) => ws.store.id) ?? [];
      setSelectedStoreIds(storeIds);
      setLocalWarehouseStores(d.warehouseStores ?? []);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('No tienes acceso a este almacén');
        setDetail(null);
        return;
      }
      if (status === 404) {
        toast.error('No tienes acceso a este almacén');
        setDetail(null);
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo cargar el almacén');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedWarehouseId || !detail) return;

    const dto: UpdateWarehouseDto = {
      name: editForm.name?.trim(),
      address: editForm.address?.trim(),
      phone: editForm.phone?.trim(),
    };

    if (!dto.name || !dto.address || !dto.phone) {
      toast.error('Complete nombre, dirección y teléfono');
      return;
    }

    try {
      setEditSubmitting(true);
      const updated = await warehouseService.updateWarehouse(selectedWarehouseId, dto);
      setDetail(updated);
      setEditForm({
        name: updated.name ?? '',
        address: updated.address ?? '',
        phone: updated.phone ?? '',
      });
      setWarehouses((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success('Almacén actualizado');
      setIsEditing(false);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }
      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }
      if (status === 409) {
        toast.error('Conflicto: los datos ingresados ya existen o no se pueden guardar.');
        return;
      }
      if (status === 400) {
        toast.error('Datos inválidos. Revise los campos e intente nuevamente.');
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'Error al actualizar almacén');
    } finally {
      setEditSubmitting(false);
    }
  };

  const ensureStoresLookupLoaded = async () => {
    if (storesLookup.length > 0) return;
    try {
      setStoresLookupLoading(true);
      const stores = await warehouseService.getStoresSimple();
      setStoresLookup(stores);
    } catch (error) {
      console.error('Error cargando lookup de tiendas:', error);
    } finally {
      setStoresLookupLoading(false);
    }
  };

  const addSelectedStore = () => {
    if (!selectedStoreId) return;
    const store = storesLookup.find((s) => s.id === selectedStoreId);
    if (!store) return;
    const exists = localWarehouseStores.some((lws) => lws.store.id === store.id);
    if (exists) {
      toast.error('Esta tienda ya está agregada');
      return;
    }
    const newWarehouseStore = {
      id: `temp-${store.id}-${Date.now()}`,
      store,
    };
    setLocalWarehouseStores((prev) => [...prev, newWarehouseStore]);
    setSelectedStoreId('');
  };

  const removeWarehouseStoreLocal = (warehouseStoreId: string) => {
    setLocalWarehouseStores((prev) => prev.filter((lws) => lws.id !== warehouseStoreId));
  };

  const handleSaveStoresEdit = async () => {
    if (!selectedWarehouseId || !detail) return;

    const storeIds = localWarehouseStores.map((lws) => lws.store.id);

    try {
      setEditStoresSubmitting(true);
      await warehouseService.updateWarehouseStores(selectedWarehouseId, storeIds);
      toast.success('Tiendas actualizadas correctamente');
      // Actualizar localmente el detalle para reflejar los cambios sin recargar todo
      setDetail((prev) => {
        if (!prev) return prev;
        const updatedStores = localWarehouseStores.map((lws) => ({
          id: lws.id,
          priority: null,
          createdAt: new Date().toISOString(),
          store: lws.store,
        }));
        return { ...prev, warehouseStores: updatedStores };
      });
      setIsEditingStores(false);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }
      if (status === 404) {
        toast.error('No tienes acceso a este almacén');
        return;
      }
      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'Error al actualizar tiendas');
    } finally {
      setEditStoresSubmitting(false);
    }
  };

  const handleCancelStoresEdit = () => {
    if (!detail) return;
    setLocalWarehouseStores(detail.warehouseStores ?? []);
    setSelectedStoreId('');
    setIsEditingStores(false);
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouseId) return;

    const ok = confirm('Esta acción no se puede deshacer. ¿Deseas eliminar este almacén?');
    if (!ok) return;

    try {
      setDeleteSubmitting(true);
      await warehouseService.deleteWarehouse(selectedWarehouseId);
      toast.success('Almacén eliminado');
      setWarehouses((prev) => prev.filter((w) => w.id !== selectedWarehouseId));
      closeDetail();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }
      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'Error al eliminar almacén');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Almacenes</CardTitle>
                <p className="text-sm text-muted-foreground">Lista de almacenes del tenant</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={openCreate}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo almacén
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por nombre, dirección o teléfono..."
                    className="pl-9 pr-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="text-center py-8">
              <WarehouseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron almacenes' : 'No hay almacenes registrados'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                    {/* Hide Dirección and Teléfono in mobile */}
                    <TableHead className="hidden sm:table-cell min-w-[200px]">Dirección</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[120px]">Teléfono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((w) => (
                    <TableRow
                      key={w.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(w.id)}
                    >
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{w.address}</TableCell>
                      <TableCell className="hidden md:table-cell">{w.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? setIsDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[980px] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">Detalle de almacén</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !detail ? (
                <div className="text-center py-6 text-muted-foreground">Sin información</div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="w-full h-auto p-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
                      <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
                      <TabsTrigger value="employees" className="text-xs sm:text-sm">Empleados</TabsTrigger>
                      <TabsTrigger value="stores" className="text-xs sm:text-sm">Tiendas</TabsTrigger>
                      <TabsTrigger value="supply-orders" className="text-xs sm:text-sm">Órdenes</TabsTrigger>
                      <TabsTrigger value="receipts" className="text-xs sm:text-sm">Recepciones</TabsTrigger>
                      <TabsTrigger value="stock" className="text-xs sm:text-sm">Stock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-4 sm:mt-6">
                      <div className="space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h3 className="text-base sm:text-lg font-semibold">Datos generales</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!detail) return;
                              setIsEditing((v) => !v);
                              setEditForm({
                                name: detail.name ?? '',
                                address: detail.address ?? '',
                                phone: detail.phone ?? '',
                              });
                            }}
                            disabled={detailLoading || editSubmitting || deleteSubmitting}
                            className="w-full sm:w-auto h-9"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">{isEditing ? 'Cancelar edición' : 'Editar'}</span>
                            <span className="sm:hidden">{isEditing ? 'Cancelar' : 'Editar'}</span>
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre</label>
                            <Input
                              value={isEditing ? editForm.name : detail.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              disabled={!isEditing}
                              className={`h-10 ${
                                isEditing
                                  ? 'bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400'
                                  : undefined
                              }`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono</label>
                            <Input
                              value={isEditing ? editForm.phone : detail.phone}
                              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                              disabled={!isEditing}
                              className={`h-10 ${
                                isEditing
                                  ? 'bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400'
                                  : undefined
                              }`}
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-medium">Dirección</label>
                            <Input
                              value={isEditing ? editForm.address : detail.address}
                              onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                              disabled={!isEditing}
                              className={`h-10 ${
                                isEditing
                                  ? 'bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400'
                                  : undefined
                              }`}
                            />
                          </div>
                        </div>

                        {isEditing && (
                          <div className="flex justify-end pt-2">
                            <Button
                              onClick={handleSaveEdit}
                              disabled={editSubmitting || deleteSubmitting}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 h-10"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {editSubmitting ? 'Guardando...' : 'Guardar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="employees">
                      {detail.warehouseEmployees && detail.warehouseEmployees.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold">Empleados asignados</h3>
                          <div className="space-y-2">
                            {detail.warehouseEmployees.map((we) => (
                              <div key={we.id} className="border rounded-lg p-4 bg-muted/20">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">
                                      {we.employed.firstName} {we.employed.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{we.role}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Asignado: {new Date(we.assignedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full ${
                                        we.employed.status === "ACTIVE"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {we.employed.status === "ACTIVE" ? "Activo" : "Inactivo"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Este almacén no tiene empleados asignados.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="stores">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">Tiendas que abastece</h3>
                            <span className="text-xs text-muted-foreground">
                              ({localWarehouseStores.length})
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {!isEditingStores ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  setIsEditingStores(true);
                                  await ensureStoresLookupLoaded();
                                }}
                              >
                                Editar tiendas
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleSaveStoresEdit}
                                  disabled={editStoresSubmitting}
                                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  {editStoresSubmitting ? "Guardando..." : "Guardar cambios"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (!detail) return;
                                    setLocalWarehouseStores(Array.isArray(detail.warehouseStores) ? detail.warehouseStores : []);
                                    setSelectedStoreId("");
                                    setIsEditingStores(false);
                                  }}
                                  disabled={editStoresSubmitting}
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditingStores && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Agregar tienda</label>
                              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                                <SelectTrigger disabled={storesLookupLoading || editStoresSubmitting}>
                                  <SelectValue placeholder={storesLookupLoading ? "Cargando..." : "Seleccionar tienda"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {storesLookup.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-end">
                              <Button
                                className="w-full"
                                onClick={addSelectedStore}
                                disabled={!selectedStoreId || editStoresSubmitting}
                              >
                                Agregar
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="rounded-md border bg-muted/20 overflow-hidden">
                          {localWarehouseStores.length === 0 ? (
                            <div className="text-sm text-muted-foreground p-6">No hay tiendas asignadas</div>
                          ) : (
                            <div className="divide-y">
                              {localWarehouseStores.map((lws) => (
                                <div
                                  key={lws.id}
                                  className="flex items-center justify-between gap-3 p-3 bg-background hover:bg-accent/40 transition-colors"
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{lws.store.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{lws.store.address}</div>
                                  </div>
                                  {isEditingStores && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeWarehouseStoreLocal(lws.id)}
                                      disabled={editStoresSubmitting}
                                    >
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="supply-orders">
                      <div className="text-sm text-muted-foreground">No implementado aún</div>
                    </TabsContent>

                    <TabsContent value="receipts">
                      <div className="text-sm text-muted-foreground">No implementado aún</div>
                    </TabsContent>

                    <TabsContent value="stock">
                      <div className="text-sm text-muted-foreground">No implementado aún</div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            <div className="border-t bg-background px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={handleDeleteWarehouse}
                  disabled={detailLoading || editSubmitting || deleteSubmitting}
                  className="sm:mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteSubmitting ? 'Eliminando...' : 'Eliminar'}
                </Button>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button variant="outline" onClick={closeDetail} disabled={editSubmitting || deleteSubmitting}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreate())}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo almacén</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input
                  value={createForm.address}
                  onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeCreate} disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={createSubmitting}>
              {createSubmitting ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
