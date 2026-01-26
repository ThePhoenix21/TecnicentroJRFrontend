"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { providerService } from "@/services/provider.service";
import { storeService } from "@/services/store.service";
import { supplyOrderService } from "@/services/supply-order.service";
import { warehouseService } from "@/services/warehouse.service";
import type {
  CreateSupplyOrderDto,
  SupplyOrderDetail,
  SupplyOrderItem,
  SupplyOrderStatus,
} from "@/types/supply-order.types";
import type { ProductLookupItem, ProviderLookupItem } from "@/types/provider.types";
import type { StoreLookupItem } from "@/types/store";
import type { WarehouseSimpleItem } from "@/services/warehouse.service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 12;

const statusLabels: Record<SupplyOrderStatus, { label: string; className: string }> = {
  ISSUED: {
    label: "Emitido",
    className: "bg-slate-100 text-slate-800",
  },
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800",
  },
  PARTIAL: {
    label: "Parcial",
    className: "bg-blue-100 text-blue-800",
  },
  PARTIALLY_RECEIVED: {
    label: "Parcialmente recibido",
    className: "bg-indigo-100 text-indigo-800",
  },
  RECEIVED: {
    label: "Recibido",
    className: "bg-emerald-100 text-emerald-800",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800",
  },
  ANNULLATED: {
    label: "Anulada",
    className: "bg-red-100 text-red-800",
  },
};

const toUtcRange = (from: string, to: string) => {
  const fromDate = `${from}T00:00:00.000Z`;
  const toDate = `${to}T23:59:59.999Z`;
  return { fromDate, toDate };
};

const shortId = (value?: string | null) => {
  if (!value) return "-";
  return value.length > 8 ? value.slice(0, 8) : value;
};

export default function OrdenesSuministroPage() {
  const [orders, setOrders] = useState<SupplyOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<SupplyOrderStatus | "all">("all");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [detail, setDetail] = useState<SupplyOrderDetail | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [providersLookup, setProvidersLookup] = useState<ProviderLookupItem[]>([]);
  const [storesLookup, setStoresLookup] = useState<StoreLookupItem[]>([]);
  const [warehousesLookup, setWarehousesLookup] = useState<WarehouseSimpleItem[]>([]);
  const [productsLookup, setProductsLookup] = useState<ProductLookupItem[]>([]);
  const [locationType, setLocationType] = useState<"store" | "warehouse">("store");
  const [createForm, setCreateForm] = useState<CreateSupplyOrderDto>({
    providerId: "",
    description: "",
    products: [{ productId: "", quantity: 1, note: "" }],
  });

  const filtersKey = useMemo(
    () => [statusFilter, userIdFilter, fromDate, toDate].join("|"),
    [statusFilter, userIdFilter, fromDate, toDate]
  );

  const loadOrders = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);

        const range = fromDate && toDate ? toUtcRange(fromDate, toDate) : null;
        const response = await supplyOrderService.getSupplyOrders({
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
          userId: userIdFilter.trim() || undefined,
          fromDate: range?.fromDate,
          toDate: range?.toDate,
        });

        setOrders(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setPage(response.page || targetPage);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.response?.data?.message || error?.message || "No se pudieron cargar las órdenes");
        setOrders([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [fromDate, toDate, statusFilter, userIdFilter]
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadOrders(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [filtersKey, loadOrders]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    loadOrders(nextPage);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setUserIdFilter("");
    setFromDate("");
    setToDate("");
  };

  const openDetail = async (orderId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const response = await supplyOrderService.getSupplyOrderById(orderId);
      setDetail(response);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el detalle");
    } finally {
      setDetailLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      providerId: "",
      description: "",
      products: [{ productId: "", quantity: 1, note: "" }],
    });
    setLocationType("store");
  };

  const ensureLookupsLoaded = async () => {
    if (lookupLoading || (providersLookup.length && storesLookup.length && warehousesLookup.length && productsLookup.length)) {
      return;
    }
    try {
      setLookupLoading(true);
      const [providers, stores, warehouses, products] = await Promise.all([
        providerService.getProvidersLookup(),
        storeService.getStoresLookup(),
        warehouseService.getWarehousesSimple(),
        providerService.getProductsLookup(),
      ]);
      setProvidersLookup(Array.isArray(providers) ? providers : []);
      setStoresLookup(Array.isArray(stores) ? stores : []);
      setWarehousesLookup(Array.isArray(warehouses) ? warehouses : []);
      setProductsLookup(Array.isArray(products) ? products : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudieron cargar los listados");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.providerId.trim()) {
      toast.error("Selecciona un proveedor");
      return;
    }

    if (locationType === "store" && !createForm.storeId?.trim()) {
      toast.error("Selecciona una tienda");
      return;
    }

    if (locationType === "warehouse" && !createForm.warehouseId?.trim()) {
      toast.error("Selecciona un almacén");
      return;
    }

    const validProducts = createForm.products.filter(
      (item) => item.productId.trim() && item.quantity > 0
    );

    if (validProducts.length === 0) {
      toast.error("Agrega al menos un producto válido");
      return;
    }

    try {
      setCreateSubmitting(true);
      await supplyOrderService.createSupplyOrder({
        providerId: createForm.providerId.trim(),
        storeId: locationType === "store" ? createForm.storeId?.trim() : undefined,
        warehouseId: locationType === "warehouse" ? createForm.warehouseId?.trim() : undefined,
        description: createForm.description?.trim() || undefined,
        products: validProducts.map((item) => ({
          productId: item.productId.trim(),
          quantity: item.quantity,
          note: item.note?.trim() || undefined,
        })),
      });
      toast.success("Orden creada");
      setCreateOpen(false);
      resetCreateForm();
      loadOrders(1);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo crear la orden");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    setDetailLoading(false);
    setDetailSubmitting(false);
  };

  const handleAnnull = async () => {
    if (!detail) return;

    const confirmed = window.confirm("¿Estás seguro de anular esta orden? Esta acción es irreversible.");
    if (!confirmed) return;

    try {
      setDetailSubmitting(true);
      await supplyOrderService.annullSupplyOrder(detail.id);
      toast.success("Orden anulada");
      closeDetail();
      loadOrders(page);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo anular la orden");
    } finally {
      setDetailSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Órdenes de suministro
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Lista de órdenes con filtros dinámicos por estado, usuario y fecha
                </p>
              </div>
              <Button
                onClick={() => {
                  ensureLookupsLoaded();
                  setCreateOpen(true);
                }}
              >
                Crear orden
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por ID de usuario creador..."
                    className="pl-9"
                    value={userIdFilter}
                    onChange={(e) => setUserIdFilter(e.target.value)}
                  />
                  {userIdFilter && (
                    <button
                      type="button"
                      onClick={() => setUserIdFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SupplyOrderStatus | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="PARTIAL">Parcial</SelectItem>
                    <SelectItem value="PARTIALLY_RECEIVED">Parcialmente recibido</SelectItem>
                    <SelectItem value="RECEIVED">Recibido</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    <SelectItem value="ANNULLATED">Anulada</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {(userIdFilter || statusFilter !== "all" || fromDate || toDate) && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Filtros activos</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2">
                    Limpiar filtros
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Mostrando <strong>{orders.length}</strong> de <strong>{total}</strong> órdenes
                  {totalPages > 1 && ` · página ${page} de ${totalPages}`}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron órdenes de suministro.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Emisión</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Almacén</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = statusLabels[order.status];
                    return (
                      <TableRow key={order.id} className="cursor-pointer" onClick={() => openDetail(order.id)}>
                        <TableCell className="font-medium">{order.code}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{shortId(order.providerId)}</TableCell>
                        <TableCell className="text-muted-foreground">{shortId(order.storeId)}</TableCell>
                        <TableCell className="text-muted-foreground">{shortId(order.warehouseId)}</TableCell>
                      </TableRow>
                    );
                  })}
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

      <Dialog open={detailOpen} onOpenChange={(open) => (open ? setDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2">
              <DialogHeader>
                <DialogTitle>Detalle de orden de suministro</DialogTitle>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Código</span>
                      <div className="text-sm font-medium">{detail.code}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Estado</span>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[detail.status].className}`}
                        >
                          {statusLabels[detail.status].label}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Emitida</span>
                      <div className="text-sm">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Actualizada</span>
                      <div className="text-sm">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : "-"}</div>
                    </div>
                  </div>

                  {detail.description && (
                    <div className="space-y-1 rounded-lg border bg-background p-4">
                      <span className="text-xs text-muted-foreground">Descripción</span>
                      <div className="text-sm">{detail.description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      <h3 className="text-sm font-semibold">Proveedor</h3>
                      <div className="text-sm space-y-1">
                        <div>{detail.provider?.name || "-"}</div>
                        {detail.provider?.ruc && <div className="text-muted-foreground">RUC: {detail.provider.ruc}</div>}
                        {detail.provider?.phone && <div className="text-muted-foreground">Tel: {detail.provider.phone}</div>}
                        {detail.provider?.email && <div className="text-muted-foreground">{detail.provider.email}</div>}
                        {detail.provider?.address && <div className="text-muted-foreground">{detail.provider.address}</div>}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      <h3 className="text-sm font-semibold">Creado por</h3>
                      <div className="text-sm space-y-1">
                        <div>{detail.createdBy?.name || "-"}</div>
                        {detail.createdBy?.email && <div className="text-muted-foreground">{detail.createdBy.email}</div>}
                        {detail.createdBy?.phone && <div className="text-muted-foreground">Tel: {detail.createdBy.phone}</div>}
                        {detail.createdBy?.username && <div className="text-muted-foreground">@{detail.createdBy.username}</div>}
                      </div>
                    </div>
                    {detail.store && (
                      <div className="space-y-2 rounded-lg border bg-background p-4">
                        <h3 className="text-sm font-semibold">Tienda</h3>
                        <div className="text-sm space-y-1">
                          <div>{detail.store.name}</div>
                          {detail.store.address && <div className="text-muted-foreground">{detail.store.address}</div>}
                          {detail.store.phone && <div className="text-muted-foreground">Tel: {detail.store.phone}</div>}
                        </div>
                      </div>
                    )}
                    {detail.warehouse && (
                      <div className="space-y-2 rounded-lg border bg-background p-4">
                        <h3 className="text-sm font-semibold">Almacén</h3>
                        <div className="text-sm space-y-1">
                          <div>{detail.warehouse.name}</div>
                          {detail.warehouse.address && <div className="text-muted-foreground">{detail.warehouse.address}</div>}
                          {detail.warehouse.phone && <div className="text-muted-foreground">Tel: {detail.warehouse.phone}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    <h3 className="text-sm font-semibold">Productos solicitados</h3>
                    {detail.products.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Sin productos</div>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {detail.products.map((product) => (
                          <div key={product.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span>{product.product?.name || "Producto"}</span>
                            <span className="text-muted-foreground">Cantidad: {product.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {detail.warehouseReceptions.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      <h3 className="text-sm font-semibold">Recepciones de almacén</h3>
                      <div className="space-y-3">
                        {detail.warehouseReceptions.map((reception) => (
                          <div key={reception.id} className="rounded-md border p-3 text-sm space-y-1">
                            <div className="font-medium">{new Date(reception.receivedAt).toLocaleString()}</div>
                            {reception.reference && <div className="text-muted-foreground">Ref: {reception.reference}</div>}
                            {reception.notes && <div className="text-muted-foreground">{reception.notes}</div>}
                            <div className="text-muted-foreground">Productos: {reception.products.length}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.storeReceptions.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      <h3 className="text-sm font-semibold">Recepciones de tienda</h3>
                      <div className="space-y-3">
                        {detail.storeReceptions.map((reception) => (
                          <div key={reception.id} className="rounded-md border p-3 text-sm space-y-1">
                            <div className="font-medium">{new Date(reception.receivedAt).toLocaleString()}</div>
                            {reception.reference && <div className="text-muted-foreground">Ref: {reception.reference}</div>}
                            {reception.notes && <div className="text-muted-foreground">{reception.notes}</div>}
                            <div className="text-muted-foreground">Productos: {reception.products.length}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t flex flex-col sm:flex-row gap-2 sm:gap-2">
              <Button variant="muted" onClick={closeDetail} disabled={detailSubmitting}>
                Cerrar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnnull}
                disabled={
                  detailSubmitting ||
                  detailLoading ||
                  !detail ||
                  !["ISSUED", "PENDING"].includes(detail.status)
                }
              >
                {detailSubmitting ? "Anulando..." : "Anular orden"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) {
            ensureLookupsLoaded();
            setCreateOpen(true);
          } else {
            setCreateOpen(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Nueva orden de suministro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <Select
                  value={createForm.providerId}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, providerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lookupLoading ? "Cargando..." : "Selecciona proveedor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {providersLookup.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Destino</label>
                <Select value={locationType} onValueChange={(value) => setLocationType(value as "store" | "warehouse")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Tienda</SelectItem>
                    <SelectItem value="warehouse">Almacén</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {locationType === "store" ? "Tienda" : "Almacén"}
              </label>
              {locationType === "store" ? (
                <Select
                  value={createForm.storeId ?? ""}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, storeId: value, warehouseId: undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lookupLoading ? "Cargando..." : "Selecciona tienda"} />
                  </SelectTrigger>
                  <SelectContent>
                    {storesLookup.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={createForm.warehouseId ?? ""}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, warehouseId: value, storeId: undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lookupLoading ? "Cargando..." : "Selecciona almacén"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehousesLookup.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={createForm.description ?? ""}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Productos</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCreateForm((prev) => ({
                      ...prev,
                      products: [...prev.products, { productId: "", quantity: 1, note: "" }],
                    }))
                  }
                >
                  Agregar producto
                </Button>
              </div>
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {createForm.products.map((item, index) => {
                  const selectedProductName = productsLookup.find((product) => product.id === item.productId)?.name;
                  return (
                    <div key={`${item.productId}-${index}`} className="space-y-3 rounded-md border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Producto {index + 1}</span>
                        {createForm.products.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCreateForm((prev) => ({
                                ...prev,
                                products: prev.products.filter((_, idx) => idx !== index),
                              }))
                            }
                            className="h-7 px-2 text-muted-foreground"
                          >
                            Quitar
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 min-w-0">
                          <label className="text-sm font-medium">Producto</label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                products: prev.products.map((prod, idx) =>
                                  idx === index ? { ...prod, productId: value } : prod
                                ),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full truncate" title={selectedProductName || undefined}>
                              <SelectValue
                                className="truncate"
                                placeholder={lookupLoading ? "Cargando..." : "Selecciona producto"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {productsLookup.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  <span className="block max-w-[220px] truncate" title={product.name}>
                                    {product.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Cantidad</label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity ?? 1}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                products: prev.products.map((prod, idx) =>
                                  idx === index
                                    ? { ...prod, quantity: Math.max(1, Number(e.target.value) || 1) }
                                    : prod
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nota</label>
                        <Input
                          value={item.note ?? ""}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              products: prev.products.map((prod, idx) =>
                                idx === index ? { ...prod, note: e.target.value } : prod
                              ),
                            }))
                          }
                          placeholder="Nota opcional"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="muted"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              disabled={createSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createSubmitting}>
              {createSubmitting ? "Creando..." : "Crear orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
