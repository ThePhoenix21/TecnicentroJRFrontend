"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { orderService, type Order, type OrderListItem, type OrderLookupItem } from "@/services/order.service";
import { storeProductService } from "@/services/store-product.service";
import { type StoreProduct } from "@/types/store-product.types";
import { type Product } from "@/types/product.types";
import { SaleForm } from "./sale-form-component";
import type { SaleData } from '@/types/sale.types';
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { clientService } from "@/services/client.service";
import { userService, type UserLookupItem } from "@/services/user.service";
import { storeService } from "@/services/store.service";
import type { StoreLookupItem } from "@/types/store";
import { uniqueBy } from "@/utils/array";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveFilters } from "@/components/ui/active-filters";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Info, ShoppingCart, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/orders/OrderDetailsDialog";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function VentasPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [clientLookup, setClientLookup] = useState<Array<{ id: string; name: string }>>([]);
  const [sellerLookup, setSellerLookup] = useState<UserLookupItem[]>([]);
  const [statusLookup, setStatusLookup] = useState<OrderLookupItem[]>([]);
  const [storesLookup, setStoresLookup] = useState<StoreLookupItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  const [clientQuery, setClientQuery] = useState("");
  const [appliedClientName, setAppliedClientName] = useState<string>("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [sellerQuery, setSellerQuery] = useState("");
  const [appliedSellerName, setAppliedSellerName] = useState<string>("");
  const [showSellerSuggestions, setShowSellerSuggestions] = useState(false);

  const [orderNumberLookup, setOrderNumberLookup] = useState<string[]>([]);
  const [orderNumberQuery, setOrderNumberQuery] = useState("");
  const [appliedOrderNumber, setAppliedOrderNumber] = useState<string>("");
  const [showOrderNumberSuggestions, setShowOrderNumberSuggestions] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [onlyCurrentCash, setOnlyCurrentCash] = useState(true);

  const clientDropdownRef = useRef<HTMLDivElement | null>(null);
  const sellerDropdownRef = useRef<HTMLDivElement | null>(null);
  const orderNumberDropdownRef = useRef<HTMLDivElement | null>(null);

  const clientOptions = useMemo(() => {
    return uniqueBy(clientLookup, (c) => c.name?.trim().toLowerCase() || "");
  }, [clientLookup]);

  const sellerOptions = useMemo(() => {
    return uniqueBy(sellerLookup, (s) => s.name?.trim().toLowerCase() || "");
  }, [sellerLookup]);

  const statusLabelMap: Record<string, string> = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    COMPLETED: "Completada",
    CANCELLED: "Anulada",
    IN_PROGRESS: "En progreso",
    DELIVERED: "Entregada",
  };

  const statusOptions = useMemo(() => (
    statusLookup.map((status) => ({
      ...status,
      label: statusLabelMap[status.value] || status.label || status.value,
    }))
  ), [statusLookup]);

  const CONSENT_PHRASE =
    "soy conciente de que los datos no se podran recuperar";
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);
  const [hardDeleteStep, setHardDeleteStep] = useState<"warning" | "form">("warning");
  const [hardDeleteFrom, setHardDeleteFrom] = useState<string>("");
  const [hardDeleteTo, setHardDeleteTo] = useState<string>("");
  const [hardDeleteEmail, setHardDeleteEmail] = useState<string>("");
  const [hardDeletePassword, setHardDeletePassword] = useState<string>("");
  const [hardDeleteReason, setHardDeleteReason] = useState<string>("");
  const [hardDeleteConsent, setHardDeleteConsent] = useState<string>("");
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);
  const [hardDeleteSubmitting, setHardDeleteSubmitting] = useState(false);

  const { currentStore, hasPermission, isAdmin, tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasSalesOfProducts = normalizedTenantFeatures.includes('SALESOFPRODUCTS');
  const hasHardDeleteSalesHistory = normalizedTenantFeatures.includes('HARD_DELETE_SALES_HISTORY');
  const hasSalesOfServices = normalizedTenantFeatures.includes('SALESOFSERVICES');
  const hasNamedServices = normalizedTenantFeatures.includes('NAMEDSERVICES');
  const hasProductsFeature = normalizedTenantFeatures.includes('PRODUCTS');
  const hasSalesFeatureGate = hasSalesOfProducts || hasSalesOfServices;

  const canSellProducts = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfProducts;
  const canViewInventory = isAdmin || hasPermission?.('VIEW_INVENTORY') || hasPermission?.('MANAGE_INVENTORY') || hasPermission?.('inventory.read') || hasPermission?.('inventory.manage');
  const canViewProductsForSales = canSellProducts && (isAdmin || hasPermission?.('MANAGE_ORDERS') || hasPermission?.('CREATE_ORDERS') || hasPermission?.('orders.create') || hasPermission?.('orders.manage'));

  const canManageOrders = isAdmin || hasPermission?.("MANAGE_ORDERS");

  const tableColSpan = 6 + (isAdmin ? 1 : 0) + (hasProductsFeature ? 1 : 0);

  const applyClientFilter = useCallback((name: string) => {
    const next = name.trim();
    setAppliedClientName(next);
    setClientQuery(next);
    setShowClientSuggestions(false);
    setCurrentPage(1);
  }, []);

  const applySellerFilter = useCallback((name: string) => {
    const next = name.trim();
    setAppliedSellerName(next);
    setSellerQuery(next);
    setShowSellerSuggestions(false);
    setCurrentPage(1);
  }, []);

  const applyOrderNumberFilter = useCallback((value: string) => {
    const next = value.trim();
    setAppliedOrderNumber(next);
    setOrderNumberQuery(next);
    setShowOrderNumberSuggestions(false);
    setCurrentPage(1);
  }, []);

  const clearFilters = () => {
    setAppliedClientName('');
    setClientQuery('');
    setShowClientSuggestions(false);
    setAppliedSellerName('');
    setSellerQuery('');
    setShowSellerSuggestions(false);
    setAppliedOrderNumber('');
    setOrderNumberQuery('');
    setShowOrderNumberSuggestions(false);
    setSelectedStatus('');
    setCurrentPage(1);
    // No afectar el checkbox "Caja actual"
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (currentStore) {
        const effectiveStoreId = selectedStoreId || currentStore.id;

        if (canSellProducts && (canViewInventory || canViewProductsForSales)) {
          try {
            const productsResponse = await storeProductService.getStoreProductsSimple(effectiveStoreId);
            const productsArray = productsResponse.data || [];
            setProducts(productsArray);
          } catch (error) {
            console.error("Error al cargar productos:", error);
            setProducts([]);
          }
        } else {
          setProducts([]);
        }

        try {
          const response = await orderService.listOrders({
            page: currentPage,
            pageSize: itemsPerPage,
            storeId: effectiveStoreId,
            ...(appliedClientName ? { clientName: appliedClientName } : {}),
            ...(appliedSellerName ? { sellerName: appliedSellerName } : {}),
            ...(appliedOrderNumber ? { orderNumber: appliedOrderNumber } : {}),
            ...(selectedStatus ? { status: selectedStatus } : {}),
            ...(onlyCurrentCash ? { currentCash: true } : {}),
          });
          setOrders(response.data || []);
          setTotalPages(response.totalPages || 1);
          setTotalItems(response.total || 0);
        } catch (error) {
          console.error("Error al cargar órdenes:", error);
          setOrders([]);
          setTotalPages(1);
          setTotalItems(0);
        }
      } else {
        setProducts([]);
        setOrders([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [
    currentStore,
    selectedStoreId,
    canSellProducts,
    canViewInventory,
    canViewProductsForSales,
    currentPage,
    itemsPerPage,
    appliedClientName,
    appliedSellerName,
    appliedOrderNumber,
    selectedStatus,
    onlyCurrentCash,
  ]);

  const resetHardDeleteModal = useCallback(() => {
    setHardDeleteStep("warning");
    setHardDeleteFrom("");
    setHardDeleteTo("");
    setHardDeleteEmail("");
    setHardDeletePassword("");
    setHardDeleteReason("");
    setHardDeleteConsent("");
    setHardDeleteError(null);
    setHardDeleteSubmitting(false);
  }, []);

  const handleHardDeleteOpenChange = useCallback(
    (open: boolean) => {
      setIsHardDeleteOpen(open);
      if (!open) resetHardDeleteModal();
    },
    [resetHardDeleteModal]
  );

  const toUtcRange = (from: string, to: string) => {
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;
    return { fromDate, toDate };
  };

  const handleHardDeleteSubmit = useCallback(async () => {
    setHardDeleteError(null);

    if (!hardDeleteFrom || !hardDeleteTo) {
      setHardDeleteError('Debes seleccionar las fechas "desde" y "hasta".');
      return;
    }

    const fromTime = new Date(`${hardDeleteFrom}T00:00:00.000Z`).getTime();
    const toTime = new Date(`${hardDeleteTo}T23:59:59.999Z`).getTime();
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime) {
      setHardDeleteError('El rango de fechas no es válido.');
      return;
    }

    if (!hardDeleteEmail.trim() || !hardDeletePassword) {
      setHardDeleteError('Debes ingresar email y contraseña.');
      return;
    }

    if (!hardDeleteReason.trim()) {
      setHardDeleteError('Debes indicar un motivo.');
      return;
    }

    if (hardDeleteConsent.trim() !== CONSENT_PHRASE) {
      setHardDeleteError('La frase de consentimiento está mal escrita.');
      return;
    }

    try {
      setHardDeleteSubmitting(true);
      const { fromDate, toDate } = toUtcRange(hardDeleteFrom, hardDeleteTo);

      await orderService.hardDeleteOrdersByDateRange({
        fromDate,
        toDate,
        email: hardDeleteEmail.trim(),
        password: hardDeletePassword,
        reason: hardDeleteReason.trim(),
      });

      toast.success('Ventas eliminadas de forma definitiva.');
      handleHardDeleteOpenChange(false);
      loadData();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        router.push('/login');
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo eliminar el historial de ventas.';
      setHardDeleteError(String(message));
    } finally {
      setHardDeleteSubmitting(false);
    }
  }, [
    CONSENT_PHRASE,
    hardDeleteConsent,
    hardDeleteEmail,
    hardDeleteFrom,
    hardDeletePassword,
    hardDeleteReason,
    hardDeleteTo,
    handleHardDeleteOpenChange,
    loadData,
    router,
  ]);

  const handleCreateOrder = useCallback(async (orderData: SaleData) => {
    if (!canManageOrders) {
      throw new Error('No tienes permisos para crear órdenes (MANAGE_ORDERS requerido)');
    }

    if (!orderData.cashSessionId) {
      throw new Error('El ID de la sesión de caja es obligatorio para crear una orden');
    }

    const products = Array.isArray(orderData.products) ? orderData.products : [];
    const services = Array.isArray(orderData.services) ? orderData.services : [];

    if (products.length === 0 && services.length === 0) {
      throw new Error('Se requiere al menos un producto o servicio');
    }

    const payload = {
      clientInfo: orderData.clientInfo
        ? {
            ...orderData.clientInfo,
            dni: orderData.clientInfo.dni || '00000000',
          }
        : { dni: '00000000' },
      ...(orderData.paymentMethods && { paymentMethods: orderData.paymentMethods }),
      ...(products.length > 0 && {
        products: products.map((p) => ({
          productId: p.productId,
          quantity: p.quantity || 1,
          ...(p.customPrice !== undefined && p.customPrice > 0 ? { price: p.customPrice } : (p.price !== undefined ? { price: p.price } : {})),
          ...(p.payments && p.payments.length > 0 ? { payments: p.payments } : {}),
        })),
      }),
      ...(services.length > 0 && {
        services: services.map((s: any) => ({
          name: (s.name || 'Defauld_Service').trim(),
          ...(s.description ? { description: s.description } : {}),
          price: Number(s.price) || 0,
          type: s.type || 'REPAIR',
          ...(s.photoUrls && s.photoUrls.length > 0 ? { photoUrls: s.photoUrls } : {}),
          ...(s.payments && s.payments.length > 0 ? { payments: s.payments } : {}),
        })),
      }),
      cashSessionId: orderData.cashSessionId,
    };

    const newOrder = await orderService.createOrder(payload as any);
    toast.success('Orden registrada exitosamente');
    await loadData();

    return {
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      orderData: newOrder,
    };
  }, [canManageOrders, loadData]);

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    if (updatedOrder?.status === 'COMPLETED') {
      setIsDetailsOpen(false);
    }
    // Refrescar el listado (server-side)
    loadData();
  }, [loadData, selectedOrder?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let isMounted = true;

    const loadLookups = async () => {
      try {
        const [clients, sellers, statuses] = await Promise.all([
          clientService.getLookupName(),
          userService.getUsersLookup(),
          orderService.getOrderStatusLookup(),
        ]);
        if (!isMounted) return;
        const safeClients = Array.isArray(clients)
          ? uniqueBy(clients, (c) => c.name?.trim().toLowerCase()).map((c) => ({
              id: c.id,
              name: String(c.name || ''),
            }))
          : [];
        const safeSellers = Array.isArray(sellers)
          ? uniqueBy(sellers, (s) => s.name?.trim().toLowerCase())
          : [];
        setClientLookup(safeClients);
        setSellerLookup(safeSellers);
        setStatusLookup(statuses || []);
      } catch (error) {
        console.error('Error cargando lookups de ventas:', error);
      }
    };

    const loadStores = async () => {
      try {
        const stores = await storeService.getStoresLookup();
        if (!isMounted) return;
        setStoresLookup(Array.isArray(stores) ? stores : []);
      } catch (error) {
        console.error('Error cargando tiendas (lookup):', error);
      }
    };

    loadLookups();
    loadStores();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentStore?.id && !selectedStoreId) {
      setSelectedStoreId(currentStore.id);
    }
  }, [currentStore?.id, selectedStoreId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowClientSuggestions(false);
      setShowSellerSuggestions(false);
      setShowOrderNumberSuggestions(false);
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(target)) {
        setShowClientSuggestions(false);
      }
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(target)) {
        setShowSellerSuggestions(false);
      }
      if (orderNumberDropdownRef.current && !orderNumberDropdownRef.current.contains(target)) {
        setShowOrderNumberSuggestions(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  useEffect(() => {
    if (!showOrderNumberSuggestions) return;
    const search = orderNumberQuery.trim();
    if (!search) {
      setOrderNumberLookup([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await orderService.lookupOrderNumbers(search);
        if (cancelled) return;
        setOrderNumberLookup(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) return;
        setOrderNumberLookup([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderNumberQuery, showOrderNumberSuggestions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewOrder = (orderId: string) => {
    orderService.getOrderById(orderId)
      .then((order) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
      })
      .catch((error) => {
        console.error('Error al cargar detalle de la orden:', error);
        toast.error('No se pudo cargar el detalle de la orden');
      });
  };

  const transformStoreProductsToProducts = useCallback((storeProducts: StoreProduct[]): Product[] => {
    const transformed = storeProducts.map(sp => ({
      id: sp.product.id,
      storeProductId: sp.id,
      name: sp.product.name,
      description: '',
      buycost: 0,
      createdById: '',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      price: Number(sp.price) || 0,
      stock: sp.stock,
      stockThreshold: 0,
      basePrice: Number(sp.price) || 0,
    }));
    return transformed;
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded-md animate-pulse"></div>
              <div className="h-4 w-64 bg-muted rounded-md animate-pulse"></div>
            </div>
            <div className="h-9 w-32 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-full max-w-2xl bg-muted rounded-md animate-pulse"></div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i} className="h-10">
                      <div className="h-4 bg-muted rounded-md w-3/4 mx-auto"></div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {[...Array(7)].map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="h-16">
                        <div className="h-4 bg-muted rounded-md w-3/4 mx-auto"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Ventas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administra y revisa el historial de ventas
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {canManageOrders && (
                  <Button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="font-medium">Nueva Venta</span>
                  </Button>
                )}

                {isAdmin && hasHardDeleteSalesHistory && (
                  <Button
                    onClick={() => setIsHardDeleteOpen(true)}
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="font-medium">Borrar historial</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div ref={clientDropdownRef} className="relative">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Input
                    placeholder="Nombre del cliente..."
                    value={clientQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientQuery(val);
                      setShowClientSuggestions(Boolean(val.trim()));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyClientFilter(clientQuery);
                      }
                      if (e.key === 'Escape') {
                        setShowClientSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowClientSuggestions(Boolean(clientQuery.trim()))}
                  />
                  {showClientSuggestions && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      <div className="max-h-56 overflow-auto">
                        {clientOptions
                          .filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
                          .slice(0, 12)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => applyClientFilter(c.name)}
                            >
                              {c.name}
                            </button>
                          ))}
                        {clientQuery.trim() &&
                          clientOptions.filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                <div ref={orderNumberDropdownRef} className="relative">
                  <Label className="text-xs text-muted-foreground">N° Orden</Label>
                  <Input
                    placeholder="Número de orden..."
                    value={orderNumberQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderNumberQuery(val);
                      setShowOrderNumberSuggestions(Boolean(val.trim()));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyOrderNumberFilter(orderNumberQuery);
                      }
                      if (e.key === 'Escape') {
                        setShowOrderNumberSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowOrderNumberSuggestions(Boolean(orderNumberQuery.trim()))}
                  />
                  {showOrderNumberSuggestions && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      <div className="max-h-56 overflow-auto">
                        {orderNumberLookup
                          .filter((n) => n.toLowerCase().includes(orderNumberQuery.trim().toLowerCase()))
                          .slice(0, 12)
                          .map((n) => (
                            <button
                              key={n}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => applyOrderNumberFilter(n)}
                            >
                              {n}
                            </button>
                          ))}
                        {orderNumberQuery.trim() &&
                          orderNumberLookup.filter((n) => n.toLowerCase().includes(orderNumberQuery.trim().toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                <div ref={sellerDropdownRef} className="relative">
                  <Label className="text-xs text-muted-foreground">Vendedor</Label>
                  <Input
                    placeholder="Nombre del vendedor..."
                    value={sellerQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellerQuery(val);
                      setShowSellerSuggestions(Boolean(val.trim()));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applySellerFilter(sellerQuery);
                      }
                      if (e.key === 'Escape') {
                        setShowSellerSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowSellerSuggestions(Boolean(sellerQuery.trim()))}
                  />
                  {showSellerSuggestions && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      <div className="max-h-56 overflow-auto">
                        {sellerOptions
                          .filter((u) => u.name.toLowerCase().includes(sellerQuery.trim().toLowerCase()))
                          .slice(0, 12)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => applySellerFilter(u.name)}
                            >
                              {u.name}
                            </button>
                          ))}
                        {sellerQuery.trim() &&
                          sellerOptions.filter((u) => u.name.toLowerCase().includes(sellerQuery.trim().toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value) => {
                      setSelectedStatus(value === '__ALL__' ? '' : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full lg:max-w-[200px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todos</SelectItem>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground h-10">
                    <Checkbox
                      id="current-cash-orders"
                      checked={onlyCurrentCash}
                      onCheckedChange={(checked) => {
                        setOnlyCurrentCash(Boolean(checked));
                        setCurrentPage(1);
                      }}
                    />
                    <label
                      htmlFor="current-cash-orders"
                      className="cursor-pointer select-none"
                    >
                      Caja actual
                    </label>
                  </div>
                </div>
              </div>

              <ActiveFilters 
                hasActiveFilters={!!(appliedClientName || appliedSellerName || appliedOrderNumber || selectedStatus)}
                onClearFilters={clearFilters}
              />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>
                  Mostrando <strong>{orders.length}</strong> de <strong>{totalItems}</strong> ventas
                  {totalPages > 1 && ` - página ${currentPage} de ${totalPages}`}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-0">
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[90px] px-2 text-center">Fecha</TableHead>
                    <TableHead className="min-w-[120px] px-2 text-center">{hasNamedServices ? 'Nombre' : 'Cliente'}</TableHead>
                    {isAdmin && (
                      <TableHead className="w-[110px] px-2 text-center">Vendedor</TableHead>
                    )}
                    {hasProductsFeature && (
                      <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Productos</TableHead>
                    )}
                    <TableHead className="w-[100px] px-2 text-center hidden md:table-cell">Servicios</TableHead>
                    <TableHead className="w-[110px] px-2 text-center">Estado</TableHead>
                    <TableHead className="min-w-[160px] px-2 text-center hidden md:table-cell">Método</TableHead>
                    <TableHead className="w-[100px] px-2 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order, index) => {
                      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                      const shortDate = createdAt ? format(createdAt, "dd/MM/yy") : "N/A";
                      const shortTime = createdAt ? format(createdAt, "HH:mm") : "-";
                      const clientName = order.clientName || "Sin cliente";
                      const displayName = hasNamedServices
                        ? order.services?.[0]?.name || "Sin nombre"
                        : clientName;
                      const productCount = order.products?.length ?? 0;
                      const serviceCount = order.services?.length ?? 0;
                      const paymentMethods = order.paymentMethods ?? [];
                      const refundPaymentMethods = order.refundPaymentMethods ?? [];
                      const visiblePaymentMethods = paymentMethods.slice(0, 2);
                      const hasMorePaymentMethods = paymentMethods.length > 2;
                      const totalPaidAmount = paymentMethods.reduce((sum, pm) => sum + (Number(pm?.amount) || 0), 0);
                      const latestPaymentMethod = paymentMethods[paymentMethods.length - 1];
                      const totalRefundAmount = refundPaymentMethods.reduce((sum, pm) => sum + (Number(pm?.amount) || 0), 0);
                      const hasRegisteredPayments = totalPaidAmount > 0;

                      const displayTotal = Number(order.total ?? 0);

                      const statusConfig = {
                        COMPLETED: {
                          text: "Completado",
                          className:
                            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                          icon: "✓",
                        },
                        PAID: {
                          text: "Pagado",
                          className:
                            "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
                          icon: "💰",
                        },
                        PENDING: {
                          text: "Pendiente",
                          className:
                            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                          icon: "⏳",
                        },
                        CANCELLED: {
                          text: "Anulado",
                          className:
                            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                          icon: "✕",
                        },
                      } as const;

                      const statusKey = (order.status || "PENDING") as keyof typeof statusConfig;
                      const status = statusConfig[statusKey] || statusConfig.PENDING;
                      const orderId = order.id || String(index);
                      const isServiceOrder = serviceCount > 0;
                      const isCancelledOrder = statusKey === 'CANCELLED';
                      const refundDifference = Math.abs(totalPaidAmount - totalRefundAmount);
                      const hasRefundDifference = refundDifference > 0.009; // Consider cent-level differences
                      let shouldShowPaymentMethods =
                        paymentMethods.length > 0 &&
                        (!isServiceOrder || hasRegisteredPayments) &&
                        (!isCancelledOrder || (hasRegisteredPayments && hasRefundDifference));

                      if (isCancelledOrder) {
                        shouldShowPaymentMethods = false;
                      }

                      return (
                        <TableRow
                          key={orderId}
                          className="hover:bg-muted/60 cursor-pointer"
                          onClick={() => order.id && handleViewOrder(order.id)}
                        >
                          <TableCell className="px-2 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs sm:text-sm font-medium">{shortDate}</span>
                              <span className="text-xs text-muted-foreground">{shortTime}</span>
                            </div>
                          </TableCell>

                          <TableCell className="px-2 py-3">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-[200px]">
                                {displayName}
                              </span>
                              {!hasNamedServices && (
                                <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                  {clientName}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {isAdmin && (
                            <TableCell className="px-2 py-3">
                              <span className="text-sm font-medium truncate max-w-[140px] sm:max-w-[200px]">
                                {order.sellerName || "Sistema"}
                              </span>
                            </TableCell>
                          )}

                          {hasProductsFeature && (
                            <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                              {productCount > 0 ? (
                                <Badge variant="outline" className="text-xs py-0.5">
                                  {productCount} {productCount === 1 ? "prod." : "prod."}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          )}

                          <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                            {serviceCount > 0 ? (
                              <Badge variant="outline" className="text-xs py-0.5">
                                {serviceCount} {serviceCount === 1 ? "serv." : "serv."}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>

                          <TableCell className="px-2 py-3">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                              >
                                <span className="mr-1">{status.icon}</span>
                                <span className="hidden sm:inline">{status.text}</span>
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="px-2 py-3 text-center hidden md:table-cell">
                            {shouldShowPaymentMethods ? (
                              <div className="flex flex-col items-center gap-0.5">
                                {statusKey === "PAID" ? (
                                  <span className="text-xs whitespace-nowrap">
                                    {`${latestPaymentMethod?.type || "-"} ${formatCurrency(totalPaidAmount)}`}
                                  </span>
                                ) : (
                                  <>
                                    {visiblePaymentMethods.map((pm, idx) => (
                                      <span
                                        key={`${order.id || index}-${pm?.type || "pm"}-${idx}`}
                                        className="text-xs whitespace-nowrap"
                                        title={String(pm?.type || "")}
                                      >
                                        {`${pm?.type || "-"} ${formatCurrency(Number(pm?.amount) || 0)}`}
                                      </span>
                                    ))}
                                    {hasMorePaymentMethods && (
                                      <span className="text-xs text-muted-foreground">...</span>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>

                          <TableCell className="px-2 py-3 text-right">
                            <span className="text-sm font-medium whitespace-nowrap">
                              {formatCurrency(displayTotal)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={tableColSpan} className="py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                          <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium text-muted-foreground">
                            No se encontraron ventas
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-md">
                            Ajusta los filtros o crea una nueva venta.
                          </p>
                          {canManageOrders && (
                            <Button onClick={() => setIsFormOpen(true)} className="mt-4" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Crear venta
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Página anterior</span>
                  ←
                </Button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Página siguiente</span>
                  →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          order={selectedOrder}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      <SaleForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          // Recargar la lista después de cerrar el modal para asegurarse de que la nueva venta aparezca
          loadData();
        }}
        onSubmit={async (data: SaleData) => {
          const transformedData: SaleData = {
            ...data,
            clientInfo: data.clientInfo ? {
              ...data.clientInfo,
              dni: data.clientInfo.dni || '00000000'
            } : undefined,
            products: data.products?.map(p => ({
              ...p,
            })) || [],
            cashSessionId: data.cashSessionId || ''
          };
          const result = await handleCreateOrder(transformedData);
          return result;
        }}
        products={canViewProductsForSales ? transformStoreProductsToProducts(products) : []}
      />

      <Dialog open={isHardDeleteOpen} onOpenChange={handleHardDeleteOpenChange}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={!hardDeleteSubmitting}>
          {hardDeleteStep === 'warning' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Borrado definitivo de ventas
                </DialogTitle>
                <DialogDescription>
                  Esta acción es absoluta y no hay forma de revertir este cambio. Se eliminarán de forma permanente los datos
                  del historial de ventas dentro del rango de fechas que indiques.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleHardDeleteOpenChange(false)}
                  disabled={hardDeleteSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setHardDeleteStep('form')}
                  disabled={hardDeleteSubmitting}
                >
                  Deseo borrar los datos de forma definitiva
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirmación final
                </DialogTitle>
                <DialogDescription>
                  Para continuar debes reingresar tus credenciales, seleccionar el rango de fechas y escribir la frase de
                  consentimiento exactamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-from">Desde</Label>
                    <Input
                      id="hard-delete-from"
                      type="date"
                      value={hardDeleteFrom}
                      onChange={(e) => setHardDeleteFrom(e.target.value)}
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-to">Hasta</Label>
                    <Input
                      id="hard-delete-to"
                      type="date"
                      value={hardDeleteTo}
                      onChange={(e) => setHardDeleteTo(e.target.value)}
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hard-delete-reason">Motivo</Label>
                  <Input
                    id="hard-delete-reason"
                    value={hardDeleteReason}
                    onChange={(e) => setHardDeleteReason(e.target.value)}
                    placeholder="Ej: Limpieza por error de carga masiva"
                    disabled={hardDeleteSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-email">Email</Label>
                    <Input
                      id="hard-delete-email"
                      type="email"
                      value={hardDeleteEmail}
                      onChange={(e) => setHardDeleteEmail(e.target.value)}
                      autoComplete="email"
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hard-delete-password">Contraseña</Label>
                    <Input
                      id="hard-delete-password"
                      type="password"
                      value={hardDeletePassword}
                      onChange={(e) => setHardDeletePassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={hardDeleteSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hard-delete-consent">
                    Escriba lo siguiente: "{CONSENT_PHRASE}"
                  </Label>
                  <textarea
                    id="hard-delete-consent"
                    value={hardDeleteConsent}
                    onChange={(e) => setHardDeleteConsent(e.target.value)}
                    disabled={hardDeleteSubmitting}
                    className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  ></textarea>
                </div>

                {hardDeleteError && (
                  <div className="text-sm text-destructive">
                    {hardDeleteError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHardDeleteStep('warning')}
                  disabled={hardDeleteSubmitting}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleHardDeleteSubmit}
                  disabled={hardDeleteSubmitting}
                >
                  {hardDeleteSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Borrar definitivamente'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}