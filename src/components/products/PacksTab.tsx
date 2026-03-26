"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ActiveFilters } from "@/components/ui/active-filters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import { storeProductService } from "@/services/store-product.service";
import { productPackService } from "@/services/product-pack.service";
import type {
  ProductPack,
  ProductPackItem,
  ProductPackListItem,
} from "@/types/product-pack.types";
import type { CatalogProductLookupItem } from "@/types/store-product.types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Info, Loader2, Package, Plus, Search, Trash2 } from "lucide-react";

type PackFormItem = {
  productId: string;
  quantity: string;
};

type PackFormState = {
  name: string;
  description: string;
  fixedPrice: string;
  items: PackFormItem[];
};

const emptyForm = (): PackFormState => ({
  name: "",
  description: "",
  fixedPrice: "",
  items: [{ productId: "", quantity: "1" }],
});

const normalizeFormFromPack = (pack: ProductPack): PackFormState => ({
  name: pack.name,
  description: pack.description || "",
  fixedPrice: String(pack.fixedPrice ?? ""),
  items: pack.items.length
    ? pack.items.map((item) => ({
        productId: item.productId,
        quantity: String(item.quantity),
      }))
    : [{ productId: "", quantity: "1" }],
});

const isPositiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export function PacksTab() {
  const { isAdmin, hasPermission, tenantFeatures, tenantFeaturesLoaded } = useAuth();
  const { canViewProducts, canManageProducts } = usePermissions();

  const normalizedTenantFeatures = (tenantFeatures || []).map((feature) => String(feature).toUpperCase());
  const hasProductsFeature = normalizedTenantFeatures.includes("PRODUCTS");

  const canViewPacks =
    (!tenantFeaturesLoaded || hasProductsFeature) &&
    (isAdmin || canViewProducts() || hasPermission?.("VIEW_PRODUCTS"));
  const canManagePacks =
    isAdmin || canManageProducts() || hasPermission?.("MANAGE_PRODUCTS");

  const [packs, setPacks] = useState<ProductPackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<ProductPack | null>(null);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [form, setForm] = useState<PackFormState>(emptyForm);
  const [catalogLookup, setCatalogLookup] = useState<CatalogProductLookupItem[]>([]);
  const [catalogLookupLoading, setCatalogLookupLoading] = useState(false);

  const loadPacks = useCallback(async () => {
    if (!canViewPacks) {
      setPacks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await productPackService.list({
        search: appliedSearch || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      });
      setPacks(response.data || []);
    } catch (error) {
      console.error("Error loading product packs:", error);
      toast.error("No se pudieron cargar los packs");
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, canViewPacks, statusFilter]);

  const loadCatalogLookup = useCallback(async () => {
    try {
      setCatalogLookupLoading(true);
      const response = await storeProductService.getCatalogProductsLookup("");
      setCatalogLookup(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error loading catalog product lookup:", error);
      setCatalogLookup([]);
    } finally {
      setCatalogLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  useEffect(() => {
    if (!formOpen) return;
    void loadCatalogLookup();
  }, [formOpen, loadCatalogLookup]);

  const activeFilters = Boolean(appliedSearch || statusFilter !== "all");

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStatusFilter("all");
  };

  const openCreateForm = () => {
    setEditingPackId(null);
    setSelectedPack(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = async (packId: string) => {
    try {
      setFormLoading(true);
      const pack = await productPackService.getById(packId);
      setEditingPackId(pack.id);
      setSelectedPack(pack);
      setForm(normalizeFormFromPack(pack));
      setFormOpen(true);
    } catch (error) {
      console.error("Error loading pack detail:", error);
      toast.error("No se pudo cargar el pack");
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (packId: string) => {
    try {
      setFormLoading(true);
      const pack = await productPackService.getById(packId);
      setSelectedPack(pack);
      setDetailOpen(true);
    } catch (error) {
      console.error("Error loading pack detail:", error);
      toast.error("No se pudo cargar el detalle del pack");
    } finally {
      setFormLoading(false);
    }
  };

  const updateFormItem = (index: number, patch: Partial<PackFormItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      )),
    }));
  };

  const addFormItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: "1" }],
    }));
  };

  const removeFormItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1
        ? [{ productId: "", quantity: "1" }]
        : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const formErrors = useMemo(() => {
    const errors: string[] = [];

    if (!form.name.trim()) errors.push("El nombre es obligatorio.");
    if (!isPositiveNumber(form.fixedPrice)) errors.push("El precio fijo debe ser mayor a 0.");

    const selectedIds = form.items.map((item) => item.productId).filter(Boolean);
    if (selectedIds.length === 0) errors.push("Debe agregar al menos un componente.");
    if (new Set(selectedIds).size !== selectedIds.length) errors.push("No se permiten productos repetidos.");

    form.items.forEach((item, index) => {
      if (!item.productId) errors.push(`Seleccione un producto en el item ${index + 1}.`);
      if (!isPositiveNumber(item.quantity)) errors.push(`La cantidad del item ${index + 1} debe ser mayor a 0.`);
    });

    return errors;
  }, [form]);

  const handleSubmit = async () => {
    if (formErrors.length > 0) {
      toast.error(formErrors[0]);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      fixedPrice: Number(form.fixedPrice),
      items: form.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    };

    try {
      setFormLoading(true);
      if (editingPackId) {
        await productPackService.update(editingPackId, payload);
        toast.success("Pack actualizado");
      } else {
        await productPackService.create(payload);
        toast.success("Pack creado");
      }

      setFormOpen(false);
      setSelectedPack(null);
      setEditingPackId(null);
      setForm(emptyForm());
      await loadPacks();
    } catch (error) {
      console.error("Error saving product pack:", error);
      toast.error("No se pudo guardar el pack");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (pack: ProductPackListItem) => {
    try {
      await productPackService.toggleActive(pack.id, !pack.isActive);
      toast.success(pack.isActive ? "Pack desactivado" : "Pack activado");
      await loadPacks();
      if (selectedPack?.id === pack.id) {
        const refreshed = await productPackService.getById(pack.id);
        setSelectedPack(refreshed);
      }
    } catch (error) {
      console.error("Error toggling pack active state:", error);
      toast.error("No se pudo cambiar el estado del pack");
    }
  };

  const handleDelete = async (pack: ProductPackListItem) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Se eliminará el pack "${pack.name}". ¿Deseas continuar?`);
      if (!confirmed) return;
    }

    try {
      await productPackService.remove(pack.id);
      toast.success("Pack eliminado");
      if (selectedPack?.id === pack.id) {
        setDetailOpen(false);
        setSelectedPack(null);
      }
      await loadPacks();
    } catch (error) {
      console.error("Error deleting pack:", error);
      toast.error("No se pudo eliminar el pack");
    }
  };

  const productNameMap = useMemo(() => {
    return new Map(catalogLookup.map((item) => [item.id, item.name]));
  }, [catalogLookup]);

  if (!canViewPacks) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Packs de Productos</h2>
          <p className="text-muted-foreground">Gestiona combos reutilizables de productos por tenant.</p>
        </div>
        {canManagePacks && (
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Crear pack
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Packs configurados</CardTitle>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <Label htmlFor="pack-search" className="mb-1 block text-sm font-medium text-muted-foreground">
                Buscar
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pack-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAppliedSearch(search.trim());
                    }
                  }}
                  placeholder="Nombre o descripción"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="min-w-[180px]">
              <Label htmlFor="pack-status" className="mb-1 block text-sm font-medium text-muted-foreground">
                Estado
              </Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger id="pack-status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="button" onClick={() => setAppliedSearch(search.trim())}>
              Aplicar filtros
            </Button>
          </div>

          <ActiveFilters hasActiveFilters={activeFilters} onClearFilters={clearFilters} />
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando packs...
            </div>
          ) : packs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No se encontraron packs.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Pack</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">Precio fijo</TableHead>
                      <TableHead className="min-w-[80px] hidden sm:table-cell">Estado</TableHead>
                      <TableHead className="min-w-[80px] hidden sm:table-cell">Componentes</TableHead>
                      <TableHead className="min-w-[100px] text-right sm:table-cell">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packs.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => void openDetail(pack.id)}
                              className="text-left font-medium hover:underline"
                            >
                              {pack.name}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-2 sm:hidden">
                              {pack.description || "Sin descripción"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{formatCurrency(Number(pack.fixedPrice || 0))}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={pack.isActive ? "default" : "secondary"}>
                            {pack.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{pack.itemsCount}</TableCell>
                        <TableCell className="text-right sm:table-cell">
                          <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                            <Button variant="outline" size="sm" onClick={() => void openDetail(pack.id)} className="w-full sm:w-auto">
                              Ver
                            </Button>
                            {canManagePacks && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => void openEditForm(pack.id)} className="w-full sm:w-auto">
                                  Editar
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => void handleToggleActive(pack)} className="w-full sm:w-auto">
                                  {pack.isActive ? "Desactivar" : "Activar"}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => void handleDelete(pack)} className="w-full sm:w-auto">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (formLoading) return;
          setFormOpen(open);
          if (!open) {
            setEditingPackId(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackId ? "Editar pack" : "Crear pack"}</DialogTitle>
            <DialogDescription>
              Define nombre, precio fijo y componentes del combo reutilizable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pack-name">Nombre</Label>
                <Input
                  id="pack-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ej: Combo gamer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack-fixed-price">Precio fijo</Label>
                <Input
                  id="pack-fixed-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.fixedPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, fixedPrice: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-description">Descripción</Label>
              <Textarea
                id="pack-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Componentes</h3>
                  <p className="text-sm text-muted-foreground">
                    Los productos se toman del catálogo del tenant. No se permiten repetidos.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addFormItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const selectedIds = form.items
                    .map((entry, entryIndex) => entryIndex !== index ? entry.productId : "")
                    .filter(Boolean);

                  return (
                    <div key={`pack-item-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_auto]">
                      <div className="space-y-2">
                        <Label>Producto</Label>
                        <Select
                          value={item.productId || undefined}
                          onValueChange={(value) => updateFormItem(index, { productId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={catalogLookupLoading ? "Cargando catálogo..." : "Seleccionar producto"} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogLookup
                              .filter((product) => !selectedIds.includes(product.id) || product.id === item.productId)
                              .map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => updateFormItem(index, { quantity: event.target.value })}
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFormItem(index)}
                          disabled={form.items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {item.productId && (
                        <div className="sm:col-span-3 text-xs text-muted-foreground">
                          {productNameMap.get(item.productId) || "Producto seleccionado"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {formErrors.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Info className="h-4 w-4" />
                    Revisa el formulario
                  </div>
                  <ul className="space-y-1">
                    {formErrors.map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formLoading}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={formLoading}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPackId ? "Guardar cambios" : "Crear pack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del pack</DialogTitle>
            <DialogDescription>
              Se muestra el snapshot actual del pack, sin depender de una tienda específica.
            </DialogDescription>
          </DialogHeader>

          {!selectedPack ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedPack.name}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Precio fijo</p>
                  <p className="font-medium">{formatCurrency(selectedPack.fixedPrice)}</p>
                </div>
                <div className="rounded-lg border p-4 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-medium">{selectedPack.description || "Sin descripción"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={selectedPack.isActive ? "default" : "secondary"}>
                  {selectedPack.isActive ? "Activo" : "Inactivo"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedPack.items.length} componente{selectedPack.items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPack.items.map((item: ProductPackItem, index) => (
                      <TableRow key={`${item.productId}-${index}`}>
                        <TableCell>{item.product?.name || item.productId}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            {canManagePacks && selectedPack && (
              <Button variant="outline" onClick={() => void openEditForm(selectedPack.id)}>
                Editar
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
