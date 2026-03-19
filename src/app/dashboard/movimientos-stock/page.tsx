"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import {
  stockTransferService,
  StockTransferStatus,
  StockTransferType,
  StockTransferDetail,
  StockTransferListItem,
  CreateStockTransferDto,
  ReceiveStockTransferDto,
  UpdateStockTransferDto,
  ProductLookupItem,
} from "@/services/stock-transfer.service";
import { storeService } from "@/services/store.service";
import { warehouseService } from "@/services/warehouse.service";
import type { StoreLookupItem } from "@/types/store";
import type { WarehouseLookupItem } from "@/types/warehouse.types";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, ArrowLeftRight, Search, X } from "lucide-react";
import { ActiveFilters } from "@/components/ui/active-filters";
import { userService, type UserLookupItem } from "@/services/user.service";

const PAGE_SIZE = 12;

const statusConfig: Record<StockTransferStatus, { label: string; className: string }> = {
  ISSUED: { label: "Emitida", className: "bg-muted text-muted-foreground" },
  PENDING: { label: "En tránsito", className: "bg-info/15 text-info" },
  PARTIAL: { label: "Recepción parcial", className: "bg-warning/20 text-foreground" },
  PARTIALLY_RECEIVED: {
    label: "Parcialmente recibida",
    className: "bg-warning/25 text-foreground",
  },
  COMPLETED: { label: "Completada", className: "bg-success/15 text-success" },
  ANNULLATED: { label: "Anulada", className: "bg-destructive/15 text-destructive" },
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const establishmentTypeLabel = (type: "STORE" | "WAREHOUSE") =>
  type === "STORE" ? "Tienda" : "Almacén";

type ReceiveItem = {
  stockTransferProductId: string;
  quantityReceived: number;
  productName?: string;
  quantityRequested: number;
};

export default function MovimientosStockPage() {
  const {
    isAdmin,
    hasPermission,
    isAuthenticated,
    currentStore,
    currentWarehouse,
    activeLoginMode,
  } = useAuth();
  const { hasWarehouse } = useTenantFeatures();

  const canView = isAdmin || hasPermission?.("VIEW_STOCK_TRANSFERS");
  const canCreate = isAdmin || hasPermission?.("CREATE_STOCK_TRANSFER");
  const canConfirm = isAdmin || hasPermission?.("CONFIRM_STOCK_TRANSFER");
  const canCancel = isAdmin || hasPermission?.("CANCEL_STOCK_TRANSFER");
  const canEdit = isAdmin || hasPermission?.("EDIT_STOCK_TRANSFER");
  const canReceive = isAdmin || hasPermission?.("RECEIVE_STOCK_TRANSFER");

  const activeEstablishmentId =
    activeLoginMode === "STORE" ? currentStore?.id : currentWarehouse?.id;

  // ─── List state ───
  const [transfers, setTransfers] = useState<StockTransferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<"list" | "receive">("list");

  // ─── Receive list state ───
  const [receiveTransfers, setReceiveTransfers] = useState<StockTransferListItem[]>([]);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receivePage, setReceivePage] = useState(1);
  const [receiveTotalPages, setReceiveTotalPages] = useState(1);

  // ─── Filters ───
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | "all">("all");
  const [codeFilter, setCodeFilter] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const [userNameFilter, setUserNameFilter] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [destinationStoreFilter, setDestinationStoreFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ─── Lookups ───
  const [usersLookup, setUsersLookup] = useState<UserLookupItem[]>([]);

  // ─── Detail modal ───
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<StockTransferDetail | null>(null);
  const [detailSubmitting, setDetailSubmitting] = useState(false);

  // ─── Create modal ───
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createTransferType, setCreateTransferType] = useState<StockTransferType | undefined>(undefined);
  const [destType, setDestType] = useState<"STORE" | "WAREHOUSE">("STORE");
  const [destId, setDestId] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createItems, setCreateItems] = useState<
    { productId: string; quantityRequested: number }[]
  >([{ productId: "", quantityRequested: 1 }]);
  const [storesLookup, setStoresLookup] = useState<StoreLookupItem[]>([]);
  const [warehousesLookup, setWarehousesLookup] = useState<WarehouseLookupItem[]>([]);
  const [productsLookup, setProductsLookup] = useState<ProductLookupItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState<ProductLookupItem[][]>([]);

  // ─── Receive modal ───
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [closePartial, setClosePartial] = useState(false);

  // ─── Annul modal ───
  const [annulOpen, setAnnulOpen] = useState(false);
  const [annulSubmitting, setAnnulSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ─── Edit modal ───
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editDestType, setEditDestType] = useState<"STORE" | "WAREHOUSE">("STORE");
  const [editDestId, setEditDestId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<
    { productId: string; quantityRequested: number }[]
  >([]);
  const [editProductsLookup, setEditProductsLookup] = useState<ProductLookupItem[]>([]);
  const [editProductsLoading, setEditProductsLoading] = useState(false);

  const loadTransfersRef = useRef<((targetPage?: number) => void) | null>(null);
  const loadReceiveTransfersRef = useRef<((targetPage?: number) => void) | null>(null);

  const toUtcRange = (from: string, to: string) => {
    const fromDate = new Date(`${from}T00:00:00`).toISOString();
    const toDate = new Date(`${to}T23:59:59.999`).toISOString();
    return { fromDate, toDate };
  };

  const openReceiveById = async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await stockTransferService.getById(id);
      setDetail(response);
      openReceive(response);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "No se pudo cargar el detalle"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const filtersKey = useMemo(
    () => [statusFilter, codeFilter, userNameFilter, destinationStoreFilter, fromDate, toDate].join("|"),
    [statusFilter, codeFilter, userNameFilter, destinationStoreFilter, fromDate, toDate]
  );

  const filtersApplied = useMemo(
    () => Boolean(codeFilter || userNameFilter || destinationStoreFilter !== "all" || fromDate || toDate || statusFilter !== "all"),
    [codeFilter, userNameFilter, destinationStoreFilter, fromDate, toDate, statusFilter]
  );

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return usersLookup.slice(0, 8);
    return usersLookup.filter((user) => user.name.toLowerCase().includes(query)).slice(0, 8);
  }, [userQuery, usersLookup]);

  const clearFilters = () => {
    setStatusFilter("all");
    setCodeFilter("");
    setCodeQuery("");
    setUserNameFilter("");
    setUserQuery("");
    setDestinationStoreFilter("all");
    setFromDate("");
    setToDate("");
  };

  // ─── Load list ───
  const loadTransfers = useCallback(
    async (targetPage = 1) => {
      if (!isAuthenticated || !canView) {
        setTransfers([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const range = fromDate && toDate ? toUtcRange(fromDate, toDate) : null;
        const params: Parameters<typeof stockTransferService.list>[0] = {
          page: targetPage,
          pageSize: PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
          code: codeFilter.trim() || undefined,
          userName: userNameFilter.trim() || undefined,
          fromDate: range?.fromDate,
          toDate: range?.toDate,
        };
        if (activeLoginMode === "STORE" && currentStore?.id) {
          params.storeId = currentStore.id;
        } else if (activeLoginMode === "WAREHOUSE" && currentWarehouse?.id) {
          params.warehouseId = currentWarehouse.id;
        }
        const response = await stockTransferService.list(params);
        const rawTransfers = response.data || [];
        const filteredTransfers =
          destinationStoreFilter === "all"
            ? rawTransfers
            : rawTransfers.filter(
                (t) =>
                  t.destination.type === "STORE" && t.destination.id === destinationStoreFilter
              );
        setTransfers(filteredTransfers);
        setTotal(
          destinationStoreFilter === "all"
            ? response.pagination?.total || 0
            : filteredTransfers.length
        );
        setTotalPages(
          destinationStoreFilter === "all" ? response.pagination?.totalPages || 1 : 1
        );
        setPage(response.pagination?.page || targetPage);
      } catch (error: any) {
        const status = error?.response?.status;
        const isAuthError = status === 401 || status === 403;
        if (!isAuthError) {
          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "No se pudieron cargar los movimientos"
          );
        }
        setTransfers([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, canView, activeLoginMode, currentStore?.id, currentWarehouse?.id, statusFilter, codeFilter, userNameFilter, destinationStoreFilter, fromDate, toDate]
  );

  loadTransfersRef.current = loadTransfers;

  const loadReceiveTransfers = useCallback(
    async (targetPage = 1) => {
      if (!isAuthenticated || !canView || !canReceive || !activeEstablishmentId) {
        setReceiveTransfers([]);
        setReceiveTotalPages(1);
        setReceivePage(1);
        return;
      }
      try {
        setReceiveLoading(true);
        const baseParams: Parameters<typeof stockTransferService.list>[0] = {
          page: targetPage,
          pageSize: PAGE_SIZE,
          fromDate: undefined,
          toDate: undefined,
          status: undefined,
        };
        if (activeLoginMode === "STORE" && currentStore?.id) {
          baseParams.storeId = currentStore.id;
        } else if (activeLoginMode === "WAREHOUSE" && currentWarehouse?.id) {
          baseParams.warehouseId = currentWarehouse.id;
        }
        const [pendingResponse, partialResponse] = await Promise.all([
          stockTransferService.list({ ...baseParams, status: StockTransferStatus.PENDING }),
          stockTransferService.list({ ...baseParams, status: StockTransferStatus.PARTIAL }),
        ]);
        const combined = [...(pendingResponse.data || []), ...(partialResponse.data || [])];
        const currentType = activeLoginMode === "STORE" ? "STORE" : "WAREHOUSE";
        const filtered = combined
          .filter(
            (t) =>
              // Solicitud (REQUEST): el origen recibe la mercancía del destino
              (t.transferType === "REQUEST" &&
                t.origin.id === activeEstablishmentId &&
                t.origin.type === currentType) ||
              // Envío (SEND): el destino recibe la mercancía del origen
              (t.transferType === "SEND" &&
                t.destination.id === activeEstablishmentId &&
                t.destination.type === currentType)
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReceiveTransfers(filtered);
        setReceivePage(targetPage);
        const totalPages = Math.max(
          pendingResponse.pagination?.totalPages || 1,
          partialResponse.pagination?.totalPages || 1
        );
        setReceiveTotalPages(totalPages || 1);
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || error?.message || "No se pudieron cargar recepciones"
        );
        setReceiveTransfers([]);
        setReceiveTotalPages(1);
        setReceivePage(1);
      } finally {
        setReceiveLoading(false);
      }
    },
    [
      isAuthenticated,
      canView,
      canReceive,
      activeLoginMode,
      currentStore?.id,
      currentWarehouse?.id,
      activeEstablishmentId,
    ]
  );

  loadReceiveTransfersRef.current = loadReceiveTransfers;

  useEffect(() => {
    if (activeTab !== "receive") return;
    loadReceiveTransfersRef.current?.(1);
  }, [activeTab, activeEstablishmentId, canReceive]);

  useEffect(() => {
    if (!isAuthenticated || !canView) return;

    const loadLookups = async () => {
      try {
        const [users, stores] = await Promise.all([
          userService.getUsersLookup(),
          storeService.getStoresLookup(),
        ]);
        setUsersLookup(Array.isArray(users) ? users : []);
        setStoresLookup(Array.isArray(stores) ? stores : []);
      } catch (error: any) {
        const status = error?.response?.status;
        const isAuthError = status === 401 || status === 403;
        if (!isAuthError) {
          console.error(error);
        }
      }
    };

    loadLookups();
  }, [isAuthenticated, canView]);

  useEffect(() => {
    if (!isAuthenticated || !canView) return;
    setPage(1);
    loadTransfersRef.current?.(1);
  }, [filtersKey, isAuthenticated, canView]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    loadTransfers(nextPage);
  };

  // ─── Detail ───
  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await stockTransferService.getById(id);
      setDetail(data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "No se pudo cargar el detalle"
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!detail) return;
    setDetailSubmitting(true);
    try {
      await stockTransferService.confirm(detail.id);
      toast.success("Transferencia confirmada");
      setDetailOpen(false);
      loadTransfersRef.current?.(page);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Error al confirmar");
    } finally {
      setDetailSubmitting(false);
    }
  };

  // ─── Create ───
  const openCreate = async () => {
    setCreateOpen(true);
    setCreateTransferType(undefined);
    setDestType("STORE");
    setDestId("");
    setCreateNotes("");
    setCreateItems([{ productId: "", quantityRequested: 1 }]);
    setProductsLookup([]);
    setProductSuggestions([]);
    try {
      // Cargar tiendas siempre
      const stores = await storeService.getStoresLookup();
      setStoresLookup(stores);
      
      // Solo cargar warehouses si está en modo WAREHOUSE y el tenant tiene la feature WAREHOUSES
      let warehouses: any[] = [];
      if (activeLoginMode === 'WAREHOUSE' && hasWarehouse()) {
        warehouses = await warehouseService.getWarehousesLookup();
      }
      setWarehousesLookup(Array.isArray(warehouses) ? warehouses : []);
      
    } catch (error: any) {
      toast.error("No se pudieron cargar los datos de destino");
    }
  };

  const loadDestinationProducts = async (
    transferType: StockTransferType,
    destEstType: "STORE" | "WAREHOUSE",
    destEstId: string
  ) => {
    if (!destEstId) return;
    setProductsLoading(true);
    setProductsLookup([]);
    setCreateItems([{ productId: "", quantityRequested: 1 }]);
    try {
      let products: ProductLookupItem[];
      if (transferType === "SEND") {
        // Envío: cargar productos del origen (establecimiento activo)
        const originId = activeLoginMode === "STORE" ? currentStore?.id : currentWarehouse?.id;
        if (!originId) { setProductsLoading(false); return; }
        products = activeLoginMode === "STORE"
          ? await stockTransferService.getStoreProductsSimpleLookup(originId)
          : hasWarehouse()
            ? await stockTransferService.getWarehouseProductsSimpleLookup(originId)
            : [];
      } else {
        // Solicitud: cargar productos del destino
        products = destEstType === "STORE"
          ? await stockTransferService.getStoreProductsSimpleLookup(destEstId)
          : hasWarehouse()
            ? await stockTransferService.getWarehouseProductsSimpleLookup(destEstId)
            : [];
      }
      setProductsLookup(products);
    } catch (error: any) {
      toast.error("No se pudieron cargar los productos");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleTransferTypeChange = (type: StockTransferType) => {
    setCreateTransferType(type);
    setProductsLookup([]);
    setProductSuggestions([]);
    setCreateItems([{ productId: "", quantityRequested: 1 }]);
    if (destId) loadDestinationProducts(type, destType, destId);
  };

  const handleDestTypeChange = (type: "STORE" | "WAREHOUSE") => {
    setDestType(type);
    setDestId("");
    setProductsLookup([]);
    setProductSuggestions([]);
    setCreateItems([{ productId: "", quantityRequested: 1 }]);
  };

  const handleDestIdChange = (id: string) => {
    setDestId(id);
    setProductSuggestions([]);
    if (createTransferType) {
      loadDestinationProducts(createTransferType, destType, id);
    }
  };

  const handleCreateItemChange = (
    index: number,
    field: "productId" | "quantityRequested",
    value: string | number
  ) => {
    setCreateItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Actualizar sugerencias de productos para este ítem
    if (field === "productId") {
      const query = String(value).trim().toLowerCase();
      const filtered = query
        ? productsLookup.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 8)
        : [];
      setProductSuggestions((prev) => {
        const updated = [...prev];
        updated[index] = filtered;
        return updated;
      });
    }
  };

  const handleProductSelect = (index: number, product: ProductLookupItem) => {
    setCreateItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId: product.id };
      return updated;
    });
    // Limpiar sugerencias
    setProductSuggestions((prev) => {
      const updated = [...prev];
      updated[index] = [];
      return updated;
    });
  };

  const handleSubmitCreate = async () => {
    if (!createTransferType) {
      toast.error("Selecciona el tipo de movimiento");
      return;
    }
    if (!destId) {
      toast.error("Selecciona un destino");
      return;
    }
    if (createItems.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (createItems.some((item) => !item.productId || item.quantityRequested < 1)) {
      toast.error("Completa todos los productos con cantidades válidas");
      return;
    }

    const dto: CreateStockTransferDto = {
      transferType: createTransferType!,
      originType: activeLoginMode === "STORE" ? "STORE" : "WAREHOUSE",
      ...(activeLoginMode === "STORE"
        ? { originStoreId: currentStore?.id }
        : { originWarehouseId: currentWarehouse?.id }),
      destinationType: destType,
      ...(destType === "STORE"
        ? { destinationStoreId: destId }
        : { destinationWarehouseId: destId }),
      notes: createNotes.trim() || undefined,
      items: createItems,
    };

    setCreateSubmitting(true);
    try {
      await stockTransferService.create(dto);
      toast.success("Transferencia creada exitosamente");
      setCreateOpen(false);
      loadTransfersRef.current?.(1);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error al crear la transferencia"
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ─── Receive ───
  const openReceive = (transferDetail: StockTransferDetail) => {
    setReceiveItems(
      transferDetail.items.map((item) => ({
        stockTransferProductId: item.id,
        quantityReceived: item.quantityRequested,
        productName: item.productName ?? item.product?.name,
        quantityRequested: item.quantityRequested,
      }))
    );
    setClosePartial(false);
    setReceiveOpen(true);
  };

  const handleSubmitReceive = async () => {
    if (!detail) return;

    // Validar que ninguna cantidad exceda lo pactado
    const excedido = receiveItems.find(
      (item) => item.quantityReceived > item.quantityRequested
    );
    if (excedido) {
      toast.error(
        `La cantidad ingresada para "${excedido.productName}" supera el volumen comprometido en esta transferencia. Por favor verifique los valores antes de continuar.`
      );
      return;
    }

    setReceiveSubmitting(true);
    try {
      const dto: ReceiveStockTransferDto = {
        items: receiveItems.map(({ stockTransferProductId, quantityReceived }) => ({
          stockTransferProductId,
          quantityReceived,
        })),
        closePartial,
      };
      await stockTransferService.receive(detail.id, dto);
      toast.success("Recepción registrada correctamente");
      setReceiveOpen(false);
      const updated = await stockTransferService.getById(detail.id);
      setDetail(updated);
      loadTransfersRef.current?.(page);
      loadReceiveTransfersRef.current?.(receivePage);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Error al recepcionar");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // ─── Annul ───
  const openAnnul = () => {
    setCancelReason("");
    setAnnulOpen(true);
  };

  const handleSubmitAnnul = async () => {
    if (!detail) return;
    if (cancelReason.trim().length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres");
      return;
    }
    setAnnulSubmitting(true);
    try {
      await stockTransferService.annul(detail.id, cancelReason.trim());
      toast.success("Transferencia anulada");
      setAnnulOpen(false);
      setDetailOpen(false);
      loadTransfersRef.current?.(page);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Error al anular");
    } finally {
      setAnnulSubmitting(false);
    }
  };

  // ─── Edit ───
  const openEdit = async (transferDetail: StockTransferDetail) => {
    setEditDestType(transferDetail.destination.type);
    setEditDestId(transferDetail.destination.id);
    setEditNotes(transferDetail.notes || "");
    setEditItems(
      transferDetail.items.map((item) => ({
        productId: item.productId,
        quantityRequested: item.quantityRequested,
      }))
    );
    setEditProductsLookup([]);
    setEditOpen(true);
    setEditProductsLoading(true);
    try {
      const [stores, warehouses, products] = await Promise.all([
        storeService.getStoresLookup(),
        // Solo cargar warehouses si el tenant tiene la feature WAREHOUSES
        ...(hasWarehouse() ? [warehouseService.getWarehousesLookup()] : [Promise.resolve([])]),
        transferDetail.destination.type === "STORE"
          ? stockTransferService.getStoreProductsSimpleLookup(transferDetail.destination.id)
          : hasWarehouse()
            ? stockTransferService.getWarehouseProductsSimpleLookup(transferDetail.destination.id)
            : Promise.resolve([]),
      ]);
      setStoresLookup(stores);
      setWarehousesLookup(Array.isArray(warehouses) ? warehouses : []);
      setEditProductsLookup(products);
    } catch (error: any) {
      toast.error("No se pudieron cargar los productos del destino");
    } finally {
      setEditProductsLoading(false);
    }
  };

  const handleEditDestTypeChange = (type: "STORE" | "WAREHOUSE") => {
    setEditDestType(type);
    setEditDestId("");
    setEditProductsLookup([]);
    setEditItems([{ productId: "", quantityRequested: 1 }]);
  };

  const handleEditDestIdChange = async (id: string) => {
    setEditDestId(id);
    setEditProductsLookup([]);
    setEditItems([{ productId: "", quantityRequested: 1 }]);
    if (!id) return;
    setEditProductsLoading(true);
    try {
      const products =
        editDestType === "STORE"
          ? await stockTransferService.getStoreProductsSimpleLookup(id)
          : hasWarehouse()
            ? await stockTransferService.getWarehouseProductsSimpleLookup(id)
            : [];
      setEditProductsLookup(products);
    } catch (error: any) {
      toast.error("No se pudieron cargar los productos del destino");
    } finally {
      setEditProductsLoading(false);
    }
  };

  const handleEditItemChange = (
    index: number,
    field: "productId" | "quantityRequested",
    value: string | number
  ) => {
    setEditItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitEdit = async () => {
    if (!detail) return;
    if (!editDestId) {
      toast.error("Selecciona el destino");
      return;
    }
    if (editItems.some((item) => !item.productId || item.quantityRequested < 1)) {
      toast.error("Completa todos los productos con cantidades válidas");
      return;
    }
    const dto: UpdateStockTransferDto = {
      destinationType: editDestType,
      ...(editDestType === "STORE"
        ? { destinationStoreId: editDestId }
        : { destinationWarehouseId: editDestId }),
      notes: editNotes.trim() || undefined,
      items: editItems,
    };
    setEditSubmitting(true);
    try {
      await stockTransferService.update(detail.id, dto);
      toast.success("Transferencia actualizada");
      setEditOpen(false);
      const updated = await stockTransferService.getById(detail.id);
      setDetail(updated);
      loadTransfersRef.current?.(page);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Error al actualizar");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── Filtered lookups (exclude active establishment) ───
  const filteredStoresLookup = useMemo(
    () =>
      storesLookup.filter(
        (s) => !(activeLoginMode === "STORE" && s.id === currentStore?.id)
      ),
    [storesLookup, activeLoginMode, currentStore?.id]
  );

  const filteredWarehousesLookup = useMemo(
    () =>
      warehousesLookup.filter(
        (w) => !(activeLoginMode === "WAREHOUSE" && w.id === currentWarehouse?.id)
      ),
    [warehousesLookup, activeLoginMode, currentWarehouse?.id]
  );

  const isOrigin = (d: StockTransferDetail) => d.origin.id === activeEstablishmentId;
  const isDestination = (d: StockTransferDetail) => d.destination.id === activeEstablishmentId;

  const originName =
    activeLoginMode === "STORE"
      ? currentStore?.name || "Tienda activa"
      : currentWarehouse?.name || "Almacén activo";

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Movimientos de Stock</h1>
            <p className="text-sm text-muted-foreground">
              Transferencias entre tiendas y almacenes
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" />
            Nueva transferencia
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "list" | "receive")}>
        <TabsList>
          <TabsTrigger value="list">Transferencias</TabsTrigger>
          {canReceive && <TabsTrigger value="receive">Recepciones</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          {/* Table Card */}
          <Card>
        <CardHeader className="pb-3">
          <div className="space-y-4">
            <CardTitle className="text-base">
              {total > 0 ? `${total} transferencia${total !== 1 ? "s" : ""}` : "Transferencias"}
            </CardTitle>

            {/* Filters */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Usuario creador */}
                <div className="relative sm:col-span-1">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground sm:text-xs">Usuario creador</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar usuario..."
                        className="pl-8 sm:pl-9 text-xs sm:text-sm h-8 sm:h-9"
                        value={userQuery}
                        onBlur={() => setTimeout(() => setShowUserSuggestions(false), 150)}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setUserQuery(nextValue);
                          setShowUserSuggestions(nextValue.trim().length > 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const trimmed = userQuery.trim();
                          if (!trimmed) return;
                          setUserNameFilter(trimmed);
                          setUserQuery(trimmed);
                          setShowUserSuggestions(false);
                        }}
                      />
                      {userQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserQuery("");
                            setUserNameFilter("");
                            setShowUserSuggestions(false);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Limpiar búsqueda"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                      {showUserSuggestions && userQuery.trim().length > 0 && (
                        <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                          {filteredUsers.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                          ) : (
                            filteredUsers.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setUserNameFilter(user.name);
                                  setUserQuery(user.name);
                                  setShowUserSuggestions(false);
                                }}
                                className="block w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted"
                              >
                                {user.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Código */}
                <div className="relative">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground sm:text-xs">Código</span>
                    <div className="relative">
                      <Input
                        type="search"
                        placeholder="Buscar código..."
                        className="text-xs sm:text-sm h-8 sm:h-9"
                        value={codeQuery}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setCodeQuery(nextValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const trimmed = codeQuery.trim();
                          setCodeFilter(trimmed);
                          setCodeQuery(trimmed);
                        }}
                      />
                      {codeQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCodeQuery("");
                            setCodeFilter("");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Limpiar búsqueda"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tienda destino */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground sm:text-xs">Tienda destino</span>
                  <Select
                    value={destinationStoreFilter}
                    onValueChange={(value) => setDestinationStoreFilter(value)}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      <SelectItem value="all">Todas</SelectItem>
                      {storesLookup.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estado */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground sm:text-xs">Estado</span>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StockTransferStatus | "all")}>
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-9">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ISSUED">Emitida</SelectItem>
                      <SelectItem value="PENDING">En tránsito</SelectItem>
                      <SelectItem value="PARTIAL">Recepción parcial</SelectItem>
                      <SelectItem value="PARTIALLY_RECEIVED">Parcialmente recibida</SelectItem>
                      <SelectItem value="COMPLETED">Completada</SelectItem>
                      <SelectItem value="ANNULLATED">Anulada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Desde */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground sm:text-xs">Desde</span>
                  <Input
                    type="date"
                    className="text-xs sm:text-sm h-8 sm:h-9"
                    value={fromDate}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                {/* Hasta */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground sm:text-xs">Hasta</span>
                  <Input
                    type="date"
                    className="text-xs sm:text-sm h-8 sm:h-9"
                    value={toDate}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>

              <ActiveFilters 
                hasActiveFilters={filtersApplied}
                onClearFilters={clearFilters}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ArrowLeftRight className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="text-xs font-medium pl-4">Código</TableHead>
                    <TableHead className="text-xs font-medium hidden sm:table-cell">Origen</TableHead>
                    <TableHead className="text-xs font-medium hidden sm:table-cell">Destino</TableHead>
                    <TableHead className="text-xs font-medium hidden sm:table-cell">Creador</TableHead>
                    <TableHead className="text-center text-xs font-medium">Productos</TableHead>
                    <TableHead className="text-center text-xs font-medium">Estado</TableHead>
                    <TableHead className="text-right text-xs font-medium pr-4 hidden sm:table-cell">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50 h-10"
                      onClick={() => openDetail(t.id)}
                    >
                      <TableCell className="font-mono text-xs font-semibold pl-4">
                        {t.code}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground mr-1">
                          [{establishmentTypeLabel(t.origin.type)}]
                        </span>
                        <span className="truncate">{t.origin.name}</span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground mr-1">
                          [{establishmentTypeLabel(t.destination.type)}]
                        </span>
                        <span className="truncate">{t.destination.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {t.createdBy.name}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {t.itemCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              t.status === "COMPLETED"
                                ? "bg-success/15 text-success"
                                : t.status === "ANNULLATED"
                                ? "bg-destructive/15 text-destructive"
                                : t.status === "PENDING"
                                ? "bg-info/15 text-info"
                                : t.status === "PARTIAL" || t.status === "PARTIALLY_RECEIVED"
                                ? "bg-warning/20 text-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {statusConfig[t.status]?.label || t.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t.transferType === "REQUEST" ? "Solicitud" : "Envío"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground pr-4 hidden sm:table-cell">
                        {formatDate(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
          {!canReceive ? (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground">
                No tienes permisos para acceder a recepciones (RECEIVE_STOCK_TRANSFER).
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="space-y-2">
                  <CardTitle className="text-base">Recepciones pendientes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Transferencias en estado pendiente o parcial dirigidas a tu establecimiento.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {receiveLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                  </div>
                ) : receiveTransfers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ArrowLeftRight className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No hay recepciones pendientes</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-9">
                          <TableHead className="text-xs font-medium pl-4">Código</TableHead>
                          <TableHead className="text-xs font-medium hidden sm:table-cell">Origen</TableHead>
                          <TableHead className="text-xs font-medium hidden sm:table-cell">Destino</TableHead>
                          <TableHead className="text-center text-xs font-medium">Estado</TableHead>
                          <TableHead className="text-right text-xs font-medium pr-4">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receiveTransfers.map((t) => (
                          <TableRow key={t.id} className="h-10">
                            <TableCell className="font-mono text-xs font-semibold pl-4">
                              {t.code}
                            </TableCell>
                            <TableCell className="text-sm max-w-[160px] hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground mr-1">
                                [{establishmentTypeLabel(t.origin.type)}]
                              </span>
                              <span className="truncate">{t.origin.name}</span>
                            </TableCell>
                            <TableCell className="text-sm max-w-[160px] hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground mr-1">
                                [{establishmentTypeLabel(t.destination.type)}]
                              </span>
                              <span className="truncate">{t.destination.name}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    statusConfig[t.status]?.className || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {statusConfig[t.status]?.label || t.status}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                    t.transferType === "REQUEST"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-success/15 text-success"
                                  }`}
                                >
                                  {t.transferType === "REQUEST" ? "Solicitud" : "Envío"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button size="sm" onClick={() => openReceiveById(t.id)}>
                                Recepcionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {receiveTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Página {receivePage} de {receiveTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        disabled={receivePage <= 1}
                        onClick={() => loadReceiveTransfersRef.current?.(receivePage - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        disabled={receivePage >= receiveTotalPages}
                        onClick={() => loadReceiveTransfersRef.current?.(receivePage + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════
          MODAL: DETALLE
      ═══════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Detalle de transferencia
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Code + status + transferType */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg font-bold">{detail.code}</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    statusConfig[detail.status]?.className || "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusConfig[detail.status]?.label || detail.status}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    detail.transferType === "REQUEST"
                      ? "bg-primary/15 text-primary"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {detail.transferType === "REQUEST" ? "Solicitud" : "Envío"}
                </span>
              </div>

              {/* Origin / Destination */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Origen
                  </p>
                  <p className="text-sm font-medium">
                    <span className="text-xs text-muted-foreground mr-1">
                      [{establishmentTypeLabel(detail.origin.type)}]
                    </span>
                    {detail.origin.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Destino
                  </p>
                  <p className="text-sm font-medium">
                    <span className="text-xs text-muted-foreground mr-1">
                      [{establishmentTypeLabel(detail.destination.type)}]
                    </span>
                    {detail.destination.name}
                  </p>
                </div>
              </div>

              {/* Dates & actors */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Creada</span>
                  {formatDate(detail.createdAt)}
                </div>
                {detail.confirmedAt && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Confirmada</span>
                    {formatDate(detail.confirmedAt)}
                  </div>
                )}
                {detail.cancelledAt && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Anulada</span>
                    {formatDate(detail.cancelledAt)}
                  </div>
                )}
                {detail.confirmedBy && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Confirmada por</span>
                    {detail.confirmedBy.name}
                  </div>
                )}
                {detail.cancelledBy && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Anulada por</span>
                    {detail.cancelledBy.name}
                  </div>
                )}
              </div>

              {/* Notes */}
              {detail.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Notas
                  </p>
                  <p className="text-sm bg-muted/40 rounded p-2">{detail.notes}</p>
                </div>
              )}

              {/* Cancel reason */}
              {detail.cancelReason && (
                <div>
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">
                    Motivo de anulación
                  </p>
                  <p className="text-sm bg-destructive/10 text-destructive rounded p-2">
                    {detail.cancelReason}
                  </p>
                </div>
              )}

              {/* Products */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Productos
                </p>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-center text-xs">
                          {detail.transferType === "SEND" ? "Enviado" : "Solicitado"}
                        </TableHead>
                        <TableHead className="text-center text-xs">Recibido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items.map((item) => (
                        <TableRow key={item.id} className="h-9">
                          <TableCell className="text-sm">
                            {item.product?.name ?? "Producto"}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {item.quantityRequested}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {item.quantityReceived !== null ? item.quantityReceived : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t">
                {/* ISSUED + ORIGEN */}
                {detail.status === StockTransferStatus.ISSUED && isOrigin(detail) && (
                  <>
                    {canConfirm && (
                      <Button size="sm" onClick={handleConfirm} disabled={detailSubmitting}>
                        {detailSubmitting && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Confirmar
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(detail)}
                        disabled={detailSubmitting}
                      >
                        Editar
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={openAnnul}
                        disabled={detailSubmitting}
                      >
                        Anular
                      </Button>
                    )}
                  </>
                )}

                {/* PENDING + ORIGEN */}
                {detail.status === StockTransferStatus.PENDING && isOrigin(detail) && (
                  <>
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={openAnnul}
                        disabled={detailSubmitting}
                      >
                        Anular
                      </Button>
                    )}
                  </>
                )}

                {/* PENDING: receptor según tipo */}
                {detail.status === StockTransferStatus.PENDING &&
                  ((detail.transferType === "REQUEST" && isOrigin(detail)) ||
                   (detail.transferType === "SEND" && isDestination(detail))) && (
                  <>
                    {canReceive && (
                      <Button size="sm" onClick={() => openReceive(detail)}>
                        Recepcionar
                      </Button>
                    )}
                  </>
                )}

                {/* PARTIAL: receptor según tipo */}
                {detail.status === StockTransferStatus.PARTIAL &&
                  ((detail.transferType === "REQUEST" && isOrigin(detail)) ||
                   (detail.transferType === "SEND" && isDestination(detail))) && (
                  <>
                    {canReceive && (
                      <Button size="sm" onClick={() => openReceive(detail)}>
                        Recepcionar
                      </Button>
                    )}
                    {canReceive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={detailSubmitting}
                        onClick={async () => {
                          setDetailSubmitting(true);
                          try {
                            await stockTransferService.closePartial(detail.id);
                            toast.success("Transferencia cerrada como recepción parcial");
                            const updated = await stockTransferService.getById(detail.id);
                            setDetail(updated);
                            loadTransfersRef.current?.(page);
                          } catch (error: any) {
                            toast.error(
                              error?.response?.data?.message ||
                                error?.message ||
                                "Error al cerrar parcial"
                            );
                          } finally {
                            setDetailSubmitting(false);
                          }
                        }}
                      >
                        {detailSubmitting && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Cerrar como parcial
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          MODAL: CREAR
      ═══════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle>Nueva transferencia de stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transfer type */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de movimiento</label>
              <Select
                value={createTransferType || ""}
                onValueChange={(v) => handleTransferTypeChange(v as StockTransferType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REQUEST">Solicitud — pedir mercancía al destino</SelectItem>
                  <SelectItem value="SEND">Envío — enviar mercancía al destino</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {createTransferType === "REQUEST"
                  ? "El destino prepara y envía. Tú (origen) recepcionas."
                  : createTransferType === "SEND"
                  ? "Tú (origen) envías. El destino recepcionas."
                  : "Selecciona el tipo de movimiento para continuar"}
              </p>
            </div>

            {/* Origin (read-only) */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {createTransferType === "REQUEST" ? "Tienda que solicita" : "Origen"}
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm text-muted-foreground">
                <span className="text-xs">
                  [{activeLoginMode === "STORE" ? "Tienda" : "Almacén"}]
                </span>
                {originName}
              </div>
            </div>

            {createTransferType && (
              <>
                {/* Destination type */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo de destino</label>
                  <Select
                    value={destType}
                    onValueChange={(v) => handleDestTypeChange(v as "STORE" | "WAREHOUSE")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STORE">Tienda</SelectItem>
                      {hasWarehouse() && (
                        <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination selector */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {createTransferType === "REQUEST" ? "Solicitado a" : "Destino"}
                  </label>
                  <Select value={destId} onValueChange={handleDestIdChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          createTransferType === "REQUEST"
                            ? "Selecciona a quién solicitar..."
                            : "Selecciona el destino..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {destType === "STORE"
                        ? filteredStoresLookup.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))
                        : filteredWarehousesLookup.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Observaciones..."
                rows={2}
              />
            </div>

            {/* Products */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {createTransferType === "REQUEST" ? "Productos a solicitar" : "Productos a enviar"}
                </label>
                {productsLoading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando productos...
                  </span>
                )}
              </div>

              {!destId ? (
                <p className="text-xs text-muted-foreground py-2">
                  Selecciona un destino para ver los productos disponibles.
                </p>
              ) : productsLoading ? null : (
                <>
                  {createItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center relative">
                      <div className="flex-1 relative">
                        <Input
                          value={item.productId ? productsLookup.find(p => p.id === item.productId)?.name || "" : ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Si está editando el texto mostrado, limpiar el productId
                            if (item.productId && value !== productsLookup.find(p => p.id === item.productId)?.name) {
                              handleCreateItemChange(idx, "productId", "");
                            }
                            handleCreateItemChange(idx, "productId", value);
                          }}
                          placeholder="Escribe para buscar producto..."
                          className="pr-8"
                        />
                        {productSuggestions[idx] && productSuggestions[idx].length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                            {productSuggestions[idx].map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductSelect(idx, product)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                              >
                                {product.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantityRequested}
                        onChange={(e) =>
                          handleCreateItemChange(
                            idx,
                            "quantityRequested",
                            Number(e.target.value)
                          )
                        }
                        className="w-20 text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() =>
                          setCreateItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        disabled={createItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCreateItems((prev) => [
                        ...prev,
                        { productId: "", quantityRequested: 1 },
                      ])
                    }
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar producto
                  </Button>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate} disabled={createSubmitting}>
              {createSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Crear transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          MODAL: RECEPCIONAR
      ═══════════════════════════════════ */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto sm:max-w-xl w-full mx-auto">
          <DialogHeader>
            <DialogTitle>Recepcionar transferencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-center text-xs">Solicitado</TableHead>
                    <TableHead className="text-center text-xs">Recibido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiveItems.map((item, idx) => (
                    <TableRow key={item.stockTransferProductId} className="h-10">
                      <TableCell className="text-sm">{item.productName}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {item.quantityRequested}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantityReceived}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setReceiveItems((prev) => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], quantityReceived: val };
                              return updated;
                            });
                          }}
                          className="w-20 text-center h-8 mx-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="close-partial"
                checked={closePartial}
                onCheckedChange={(v) => setClosePartial(v === true)}
              />
              <label htmlFor="close-partial" className="text-sm cursor-pointer">
                Cerrar aunque esté incompleto
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitReceive} disabled={receiveSubmitting}>
              {receiveSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Confirmar recepción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          MODAL: ANULAR
      ═══════════════════════════════════ */}
      <Dialog open={annulOpen} onOpenChange={setAnnulOpen}>
        <DialogContent className="max-w-md sm:max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle>Anular transferencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Indica el motivo de la anulación.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Motivo de anulación</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Mínimo 10 caracteres..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancelReason.length} caracteres (mínimo 10)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnulOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitAnnul}
              disabled={annulSubmitting || cancelReason.trim().length < 10}
            >
              {annulSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Confirmar anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          MODAL: EDITAR (solo ISSUED)
      ═══════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-md w-[95%] mx-auto">
          <DialogHeader>
            <DialogTitle>Editar transferencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de destino</label>
                <Select
                  value={editDestType}
                  onValueChange={(v) => handleEditDestTypeChange(v as "STORE" | "WAREHOUSE")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORE">Tienda</SelectItem>
                    {hasWarehouse() && (
                      <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Destino</label>
                <Select value={editDestId} onValueChange={handleEditDestIdChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {(editDestType === "STORE" ? storesLookup : warehousesLookup).map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Observaciones..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Productos</label>
                {editProductsLoading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando...
                  </span>
                )}
              </div>

              {editItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={item.productId}
                    onValueChange={(v) => handleEditItemChange(idx, "productId", v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona producto..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {editProductsLookup.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantityRequested}
                    onChange={(e) =>
                      handleEditItemChange(idx, "quantityRequested", Number(e.target.value))
                    }
                    className="w-20 text-center"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                    onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={editItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditItems((prev) => [...prev, { productId: "", quantityRequested: 1 }])
                }
                className="w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar producto
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit} disabled={editSubmitting}>
              {editSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
