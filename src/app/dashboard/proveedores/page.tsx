"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X, Users, Pencil, Trash2, Save, Plus } from "lucide-react";

import { providerService } from "@/services/provider.service";
import type {
  CreateProviderDto,
  ProductLookupItem,
  ProviderDetail,
  ProviderListItem,
  ProviderLookupItem,
  ProviderProductItem,
  ProviderRucLookupItem,
  UpdateProviderDto,
} from "@/types/provider.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { uniqueBy } from "@/utils/array";

const toUtcRange = (from: string, to: string) => {
  const fromDate = `${from}T00:00:00.000Z`;
  const toDate = `${to}T23:59:59.999Z`;
  return { fromDate, toDate };
};

export default function ProveedoresPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [providerFilter, setProviderFilter] = useState("");
  const [providerQuery, setProviderQuery] = useState("");
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);
  const [rucFilter, setRucFilter] = useState("");
  const [rucQuery, setRucQuery] = useState("");
  const [showRucSuggestions, setShowRucSuggestions] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProviderDto>({
    ruc: "",
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProviderDetail | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProviderDto>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [productsLookup, setProductsLookup] = useState<ProductLookupItem[]>([]);
  const [providersLookup, setProvidersLookup] = useState<ProviderLookupItem[]>([]);
  const [providersRucLookup, setProvidersRucLookup] = useState<ProviderRucLookupItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [localProviderProducts, setLocalProviderProducts] = useState<ProviderProductItem[]>([]);
  const [isEditingProducts, setIsEditingProducts] = useState(false);
  const [productsSubmitting, setProductsSubmitting] = useState(false);

  const loadProviders = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      const range = fromDate && toDate ? toUtcRange(fromDate, toDate) : null;
      const response = await providerService.getProviders({
        page: targetPage,
        pageSize: 12,
        provider: providerFilter.trim() || undefined,
        ruc: rucFilter.trim() || undefined,
        fromDate: range?.fromDate,
        toDate: range?.toDate,
      });
      setProviders(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setPage(response.page || targetPage);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al cargar proveedores");
      setProviders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, providerFilter, rucFilter]);

  const filteredProviderSuggestions = useMemo(() => {
    const query = providerQuery.trim().toLowerCase();
    if (!query) return providersLookup.slice(0, 8);
    return providersLookup.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [providerQuery, providersLookup]);

  const filteredRucSuggestions = useMemo(() => {
    const query = rucQuery.trim().toLowerCase();
    if (!query) return providersRucLookup.slice(0, 8);
    return providersRucLookup.filter((item) => item.ruc.toLowerCase().includes(query)).slice(0, 8);
  }, [rucQuery, providersRucLookup]);

  useEffect(() => {
    loadProviders(1);
  }, [loadProviders]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [providers, rucs] = await Promise.all([
          providerService.getProvidersLookup(),
          providerService.getProvidersRucLookup(),
        ]);
        const safeProviders = Array.isArray(providers)
          ? uniqueBy(providers, (item) => item.name?.trim().toLowerCase())
          : [];
        const safeRucs = Array.isArray(rucs)
          ? uniqueBy(rucs, (item) => item.ruc?.trim())
          : [];
        setProvidersLookup(safeProviders);
        setProvidersRucLookup(safeRucs);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.response?.data?.message || error?.message || "No se pudieron cargar los lookups");
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadProviders(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [providerFilter, rucFilter, fromDate, toDate, loadProviders]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    loadProviders(nextPage);
  };

  const clearFilters = () => {
    setProviderFilter("");
    setProviderQuery("");
    setShowProviderSuggestions(false);
    setRucFilter("");
    setRucQuery("");
    setShowRucSuggestions(false);
    setFromDate("");
    setToDate("");
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedProviderId(null);
    setDetail(null);
    setIsEditing(false);
    setEditSubmitting(false);
    setSelectedProductId("");
    setLocalProviderProducts([]);
    setIsEditingProducts(false);
    setProductsSubmitting(false);
  };

  const openCreate = () => {
    setIsCreateOpen(true);
    setCreateSubmitting(false);
    setCreateForm({
      ruc: "",
      name: "",
      phone: "",
      email: "",
      address: "",
    });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateSubmitting(false);
  };

  const submitCreate = async () => {
    const dto: CreateProviderDto = {
      ruc: createForm.ruc?.trim(),
      name: createForm.name?.trim(),
      phone: createForm.phone?.trim() || undefined,
      email: createForm.email?.trim() || undefined,
      address: createForm.address?.trim() || undefined,
    };

    if (!dto.ruc || !dto.name) {
      toast.error("Complete RUC y Nombre");
      return;
    }

    try {
      setCreateSubmitting(true);
      await providerService.createProvider(dto);
      toast.success("Proveedor creado");
      closeCreate();
      await loadProviders();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al crear proveedor");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const ensureLookupLoaded = async () => {
    if (lookupLoading || productsLookup.length > 0) return;
    try {
      setLookupLoading(true);
      const data = await providerService.getProductsLookup();
      setProductsLookup(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el catálogo");
      setProductsLookup([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const openDetail = async (providerId: string) => {
    setIsDetailOpen(true);
    setSelectedProviderId(providerId);
    setIsEditing(false);
    setIsEditingProducts(false);

    try {
      setDetailLoading(true);
      const d = await providerService.getProviderById(providerId);
      setDetail(d);
      setEditForm({
        name: d.name ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        address: d.address ?? "",
      });
      setLocalProviderProducts(Array.isArray(d.providerProducts) ? d.providerProducts : []);
      await ensureLookupLoaded();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el proveedor");
      setDetail(null);
      setLocalProviderProducts([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!detail || !selectedProviderId) return;

    const dto: UpdateProviderDto = {};

    const nextName = editForm.name?.trim() ?? "";
    const nextPhone = editForm.phone?.trim() ?? "";
    const nextEmail = editForm.email?.trim() ?? "";
    const nextAddress = editForm.address?.trim() ?? "";

    if (nextName && nextName !== detail.name) dto.name = nextName;
    if (nextPhone !== String(detail.phone ?? "")) dto.phone = nextPhone;
    if (nextEmail !== String(detail.email ?? "")) dto.email = nextEmail;
    if (nextAddress !== String(detail.address ?? "")) dto.address = nextAddress;

    if (Object.keys(dto).length === 0) {
      toast.message("No hay cambios para guardar");
      setIsEditing(false);
      return;
    }

    try {
      setEditSubmitting(true);
      const updated = await providerService.updateProvider(selectedProviderId, dto);
      setDetail(updated);
      setEditForm({
        name: updated.name ?? "",
        phone: updated.phone ?? "",
        email: updated.email ?? "",
        address: updated.address ?? "",
      });
      toast.success("Proveedor actualizado");
      setIsEditing(false);
      await loadProviders();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al actualizar proveedor");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!selectedProviderId) return;

    const ok = confirm("¿Está seguro de eliminar este proveedor?");
    if (!ok) return;

    try {
      await providerService.deleteProvider(selectedProviderId);
      toast.success("Proveedor eliminado");
      closeDetail();
      await loadProviders();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al eliminar proveedor");
    }
  };

  const addSelectedProduct = () => {
    if (!selectedProductId) return;

    const exists = localProviderProducts.some((pp) => pp.product?.id === selectedProductId);
    if (exists) {
      toast.error("El producto ya está agregado");
      return;
    }

    const product = productsLookup.find((p) => p.id === selectedProductId);
    if (!product) return;

    setLocalProviderProducts((prev) => [
      ...prev,
      {
        id: `local-${product.id}`,
        buyCost: null,
        product: { id: product.id, name: product.name, description: "" },
      },
    ]);
    setSelectedProductId("");
  };

  const removeProviderProductLocal = (providerProductId: string) => {
    setLocalProviderProducts((prev) => prev.filter((pp) => pp.id !== providerProductId));
  };

  const handleSaveProducts = async () => {
    if (!selectedProviderId) return;

    const productIds = Array.from(
      new Set(localProviderProducts.map((pp) => pp.product?.id).filter(Boolean) as string[])
    );

    try {
      setProductsSubmitting(true);
      const res = await providerService.saveProviderProducts(selectedProviderId, productIds);
      if (res?.success) {
        toast.success("Productos actualizados");
      } else {
        toast.success("Cambios guardados");
      }

      // Re-sincronizar con backend (fuente de verdad)
      const refreshed = await providerService.getProviderById(selectedProviderId);
      setDetail(refreshed);
      setLocalProviderProducts(Array.isArray(refreshed.providerProducts) ? refreshed.providerProducts : []);
      setSelectedProductId("");
      setIsEditingProducts(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al guardar productos");
    } finally {
      setProductsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Proveedores</CardTitle>
                <p className="text-sm text-muted-foreground">Lista de proveedores</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={openCreate}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo proveedor
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar proveedor..."
                    className="pl-9"
                    value={providerQuery}
                    onFocus={() => setShowProviderSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProviderSuggestions(false), 150)}
                    onChange={(e) => {
                      setProviderQuery(e.target.value);
                      setProviderFilter("");
                      setShowProviderSuggestions(true);
                    }}
                  />
                  {providerQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setProviderQuery("");
                        setProviderFilter("");
                        setShowProviderSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {showProviderSuggestions && filteredProviderSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredProviderSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setProviderFilter(item.name);
                            setProviderQuery(item.name);
                            setShowProviderSuggestions(false);
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
                    type="search"
                    placeholder="Filtrar por RUC..."
                    value={rucQuery}
                    onFocus={() => setShowRucSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRucSuggestions(false), 150)}
                    onChange={(e) => {
                      setRucQuery(e.target.value);
                      setRucFilter("");
                      setShowRucSuggestions(true);
                    }}
                  />
                  {rucQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setRucQuery("");
                        setRucFilter("");
                        setShowRucSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {showRucSuggestions && filteredRucSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredRucSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setRucFilter(item.ruc);
                            setRucQuery(item.ruc);
                            setShowRucSuggestions(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          {item.ruc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>

              {(providerFilter || rucFilter || fromDate || toDate) && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Filtros activos</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2">
                    Limpiar filtros
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Mostrando <strong>{providers.length}</strong> de <strong>{total}</strong> proveedores
                  {totalPages > 1 && ` · página ${page} de ${totalPages}`}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {providerFilter || rucFilter || fromDate || toDate
                  ? "No se encontraron proveedores"
                  : "No hay proveedores registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-center">Órdenes activas</TableHead>
                    <TableHead className="text-center">Órdenes anuladas</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(p.id)}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.ruc}</TableCell>
                      <TableCell>{p.address}</TableCell>
                      <TableCell className="text-center">{p.activeOrdersCount ?? 0}</TableCell>
                      <TableCell className="text-center">{p.annulledOrdersCount ?? 0}</TableCell>
                      <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

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
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? setIsDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2">
              <DialogHeader>
                <DialogTitle>Detalle de proveedor</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !detail ? (
                <div className="text-center py-6 text-muted-foreground">Sin información</div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Datos generales</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre</label>
                        <Input
                          value={isEditing ? (editForm.name ?? "") : detail.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          disabled={!isEditing}
                          className={
                            isEditing
                              ? "bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400"
                              : undefined
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">RUC</label>
                        <Input value={detail.ruc} disabled />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <Input
                          value={isEditing ? (editForm.phone ?? "") : (detail.phone ?? "")}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                          disabled={!isEditing}
                          className={
                            isEditing
                              ? "bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400"
                              : undefined
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          value={isEditing ? (editForm.email ?? "") : (detail.email ?? "")}
                          onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                          disabled={!isEditing}
                          className={
                            isEditing
                              ? "bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400"
                              : undefined
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <Input
                          value={isEditing ? (editForm.address ?? "") : (detail.address ?? "")}
                          onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                          disabled={!isEditing}
                          className={
                            isEditing
                              ? "bg-emerald-50 border-emerald-300 focus-visible:ring-emerald-400"
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Auditoría</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Creado</label>
                        <Input value={detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"} disabled />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Actualizado</label>
                        <Input value={detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : "-"} disabled />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Creado por</label>
                        <Input
                          value={detail.createdBy ? `${detail.createdBy.name} (${detail.createdBy.email})` : "-"}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">Productos que abastece</h3>
                        <span className="text-xs text-muted-foreground">
                          ({localProviderProducts.length})
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {!isEditingProducts ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setIsEditingProducts(true);
                              await ensureLookupLoaded();
                            }}
                          >
                            Editar productos
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveProducts}
                              disabled={productsSubmitting}
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              {productsSubmitting ? "Guardando..." : "Guardar cambios"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!detail) return;
                                setLocalProviderProducts(Array.isArray(detail.providerProducts) ? detail.providerProducts : []);
                                setSelectedProductId("");
                                setIsEditingProducts(false);
                              }}
                              disabled={productsSubmitting}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingProducts && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Agregar producto</label>
                          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger disabled={lookupLoading || productsSubmitting}>
                              <SelectValue placeholder={lookupLoading ? "Cargando..." : "Seleccionar producto"} />
                            </SelectTrigger>
                            <SelectContent>
                              {productsLookup.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button
                            className="w-full"
                            onClick={addSelectedProduct}
                            disabled={!selectedProductId || productsSubmitting}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border bg-muted/20 overflow-hidden">
                      {localProviderProducts.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-6">No hay productos asignados</div>
                      ) : (
                        <div className="divide-y">
                          {localProviderProducts.map((pp) => (
                            <div
                              key={pp.id}
                              className="flex items-center justify-between gap-3 p-3 bg-background hover:bg-accent/40 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{pp.product.name}</div>
                              </div>
                              {isEditingProducts && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeProviderProductLocal(pp.id)}
                                  disabled={productsSubmitting}
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
                </div>
              )}
            </div>

            <div className="border-t bg-background px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={handleDeleteProvider}
                  disabled={detailLoading || editSubmitting}
                  className="sm:mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!detail) return;
                      setIsEditing((v) => !v);
                      setEditForm({
                        name: detail.name ?? "",
                        phone: detail.phone ?? "",
                        email: detail.email ?? "",
                        address: detail.address ?? "",
                      });
                    }}
                    disabled={detailLoading || editSubmitting}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancelar edición" : "Editar"}
                  </Button>

                  {isEditing && (
                    <Button onClick={handleSaveEdit} disabled={editSubmitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  )}

                  <Button variant="outline" onClick={closeDetail}>
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
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">RUC</label>
                <Input
                  value={createForm.ruc}
                  onChange={(e) => setCreateForm((p) => ({ ...p, ruc: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={createForm.phone ?? ""}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={createForm.email ?? ""}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  disabled={createSubmitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input
                  value={createForm.address ?? ""}
                  onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
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
              {createSubmitting ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
