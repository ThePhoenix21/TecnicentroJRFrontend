"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X, Users, Pencil, Trash2, Save, Plus, Package, Loader2 } from "lucide-react";
import { ActiveFilters } from "@/components/ui/active-filters";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDeniedView } from "@/components/auth/access-denied-view";

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
import { QRScanner } from "@/components/ui/qr-scanner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  const fromDate = new Date(`${from}T00:00:00`).toISOString();
  const toDate = new Date(`${to}T23:59:59.999`).toISOString();
  return { fromDate, toDate };
};

export default function ProveedoresPage() {
  // Permisos - Control exclusivo por permisos, sin roles
  const { canViewSuppliers, canManageSuppliers, canDeleteSuppliers } = usePermissions();

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
  const [createProductQuery, setCreateProductQuery] = useState("");
  const [createProductSuggestions, setCreateProductSuggestions] = useState<ProductLookupItem[]>([]);
  const [createProductsLoading, setCreateProductsLoading] = useState(false);
  const [createSelectedProducts, setCreateSelectedProducts] = useState<ProductLookupItem[]>([]);
  const [createActiveTab, setCreateActiveTab] = useState<"details" | "products">("details");

  type NewProductDraft = {
    id: string;
    name: string;
    sku: string;
    description: string;
    basePrice: string;
    buyCost: string;
  };

  const [createNewProducts, setCreateNewProducts] = useState<NewProductDraft[]>([]);

  const [editNewProducts, setEditNewProducts] = useState<
    Array<{
      name: string;
      sku?: string;
      description?: string;
      basePrice?: string;
      buyCost?: string;
      tempId: string;
    }>
  >([]);

  const [allProductsLookup, setAllProductsLookup] = useState<ProductLookupItem[]>([]);

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
      
      // Manejo específico de errores 403 (permisos)
      if (error?.response?.status === 403) {
        toast.error("No tienes permisos para ver proveedores");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Error al cargar proveedores");
      }
      
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
    return providersRucLookup
      .filter((item) => item.ruc && item.ruc.toLowerCase().includes(query))
      .slice(0, 8);
  }, [rucQuery, providersRucLookup]);

  const filteredCreateProductSuggestions = useMemo(() => {
    const query = createProductQuery.trim().toLowerCase();
    if (!query) return [];
    return createProductSuggestions.filter(
      (item) =>
        item.name.toLowerCase().includes(query) &&
        !createSelectedProducts.some((selected) => selected.id === item.id)
    );
  }, [createProductQuery, createProductSuggestions, createSelectedProducts]);

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

  const loadCreateProductSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCreateProductSuggestions([]);
      return;
    }
    try {
      setCreateProductsLoading(true);
      const results = await providerService.getProductsLookup(query.trim());
      setCreateProductSuggestions(Array.isArray(results) ? results : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el catálogo");
      setCreateProductSuggestions([]);
    } finally {
      setCreateProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCreateProductSuggestions(createProductQuery);
    }, 350);
    return () => clearTimeout(timeout);
  }, [createProductQuery, loadCreateProductSuggestions]);

  useEffect(() => {
    if (!isCreateOpen && !isDetailOpen) return;

    const loadAllProductsLookup = async () => {
      try {
        const results = await providerService.getProductsLookup();
        setAllProductsLookup(Array.isArray(results) ? results : []);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el catálogo");
        setAllProductsLookup([]);
      }
    };

    loadAllProductsLookup();
  }, [isCreateOpen, isDetailOpen]);

  const handleAddCreateProduct = (product: ProductLookupItem) => {
    setCreateSelectedProducts((prev) =>
      prev.some((item) => item.id === product.id) ? prev : [...prev, product]
    );
    setCreateProductQuery("");
    setCreateProductSuggestions([]);
  };

  const handleRemoveCreateProduct = (productId: string) => {
    setCreateSelectedProducts((prev) => prev.filter((item) => item.id !== productId));
  };

  const addCreateNewProduct = () => {
    setCreateNewProducts((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        sku: "",
        description: "",
        basePrice: "",
        buyCost: "",
      },
    ]);
  };

  const updateCreateNewProduct = (id: string, field: keyof NewProductDraft, value: string) => {
    setCreateNewProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeCreateNewProduct = (id: string) => {
    setCreateNewProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const addEditNewProduct = () => {
    setEditNewProducts((prev) => [
      ...prev,
      {
        tempId: `edit-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        sku: "",
        description: "",
        basePrice: "",
        buyCost: "",
      },
    ]);
  };

  const updateEditNewProduct = (
    id: string,
    field: "name" | "sku" | "description" | "basePrice" | "buyCost",
    value: string
  ) => {
    setEditNewProducts((prev) =>
      prev.map((item) => (item.tempId === id ? { ...item, [field]: value } : item))
    );
  };

  const removeEditNewProduct = (id: string) => {
    setEditNewProducts((prev) => prev.filter((item) => item.tempId !== id));
  };

  const handleQRScanProvider = useCallback((code: string) => {
    const trimmed = code.trim();
    const sku = trimmed.toLowerCase();

    const matched = allProductsLookup.find(
      (product) => (product.sku ?? "").trim().toLowerCase() === sku
    );

    if (!matched) {
      toast.error(`Producto no encontrado: ${trimmed}`);
      return;
    }

    if (isCreateOpen) {
      const alreadyAdded = createSelectedProducts.some((product) => product.id === matched.id);
      if (alreadyAdded) {
        toast.error(`${matched.name} ya está en la lista`);
        return;
      }
      setCreateSelectedProducts((prev) => [...prev, matched]);
      toast.success(`Producto agregado: ${matched.name}`);
      return;
    }

    if (isDetailOpen && isEditing) {
      const alreadyAdded = localProviderProducts.some((item) => item.product?.id === matched.id);
      if (alreadyAdded) {
        toast.error(`${matched.name} ya está en la lista`);
        return;
      }
      setLocalProviderProducts((prev) => [
        ...prev,
        {
          id: `local-${matched.id}`,
          buyCost: null,
          product: { id: matched.id, name: matched.name, description: "" },
        },
      ]);
      toast.success(`Producto agregado: ${matched.name}`);
    }
  }, [
    allProductsLookup,
    createSelectedProducts,
    isCreateOpen,
    isDetailOpen,
    isEditing,
    localProviderProducts,
  ]);

  const renderCreateProviderFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre <span className="text-destructive">*</span></label>
        <Input
          value={createForm.name}
          onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
          disabled={createSubmitting}
          placeholder="Nombre del proveedor"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">RUC <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
        <Input
          value={createForm.ruc ?? ""}
          onChange={(e) => setCreateForm((p) => ({ ...p, ruc: e.target.value }))}
          disabled={createSubmitting}
          placeholder="Ej. 20123456789"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Teléfono</label>
        <Input
          value={createForm.phone ?? ""}
          onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
          disabled={createSubmitting}
          placeholder="Ej. +51 999 999 999"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input
          value={createForm.email ?? ""}
          onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
          disabled={createSubmitting}
          placeholder="contacto@proveedor.com"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-sm font-medium">Dirección</label>
        <Input
          value={createForm.address ?? ""}
          onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))}
          disabled={createSubmitting}
          placeholder="Av. Principal 123"
          className="h-10"
        />
      </div>
    </div>
  );

  const renderCreateProductsSection = () => (
    <div className="flex flex-col gap-3 h-full">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Buscar producto</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={createProductQuery}
            onChange={(e) => setCreateProductQuery(e.target.value)}
            disabled={createSubmitting}
            placeholder={createProductsLoading ? "Buscando..." : "Nombre del producto..."}
            className="h-10 pl-9 pr-9"
          />
          {createProductsLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {createProductQuery.trim() && filteredCreateProductSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
              {filteredCreateProductSuggestions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddCreateProduct(product)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/40 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {product.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <QRScanner
          onScan={handleQRScanProvider}
          enabled={isCreateOpen}
          mode="both"
          buttonLabel="Escanear"
        />
        <p className="text-xs text-muted-foreground">Escribe para buscar en el catálogo.</p>
      </div>

      <div className="mb-4 rounded-lg border bg-background overflow-hidden flex-1 min-h-0 shadow-sm flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asignados</span>
          {createSelectedProducts.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary font-semibold rounded-full px-2 py-0.5">
              {createSelectedProducts.length}
            </span>
          )}
        </div>
        {createSelectedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 gap-2 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin productos asignados</p>
          </div>
        ) : (
          <div className="flex-1 divide-y overflow-y-auto max-h-56">
            {createSelectedProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{product.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveCreateProduct(product.id)}
                  disabled={createSubmitting}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-background shadow-sm flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevos productos</span>
            <span className="text-xs text-muted-foreground">(opcionales)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCreateNewProduct}
            disabled={createSubmitting}
            className="h-7"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar
          </Button>
        </div>
        {createNewProducts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            Agrega productos nuevos que no estén en el catálogo.
          </div>
        ) : (
          <div className="divide-y max-h-60 overflow-y-auto">
            {createNewProducts.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">Nuevo producto</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCreateNewProduct(item.id)}
                    disabled={createSubmitting}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nombre *</label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateCreateNewProduct(item.id, "name", e.target.value)}
                      disabled={createSubmitting}
                      placeholder="Nombre del producto"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">SKU *</label>
                    <Input
                      value={item.sku}
                      onChange={(e) => updateCreateNewProduct(item.id, "sku", e.target.value)}
                      disabled={createSubmitting}
                      placeholder="SKU-0001"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Descripción</label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateCreateNewProduct(item.id, "description", e.target.value)}
                      disabled={createSubmitting}
                      placeholder="Descripción breve"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Precio base</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={item.basePrice}
                      onChange={(e) => updateCreateNewProduct(item.id, "basePrice", e.target.value)}
                      disabled={createSubmitting}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Costo</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={item.buyCost}
                      onChange={(e) => updateCreateNewProduct(item.id, "buyCost", e.target.value)}
                      disabled={createSubmitting}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
    setProductsSubmitting(false);
    setEditNewProducts([]);
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
    setCreateProductQuery("");
    setCreateProductSuggestions([]);
    setCreateProductsLoading(false);
    setCreateSelectedProducts([]);
    setCreateNewProducts([]);
    setCreateActiveTab("details");
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateSubmitting(false);
    setCreateProductQuery("");
    setCreateProductSuggestions([]);
    setCreateProductsLoading(false);
    setCreateSelectedProducts([]);
    setCreateNewProducts([]);
    setCreateActiveTab("details");
  };

  const submitCreate = async () => {
    const newProducts = createNewProducts
      .map((item) => {
        const name = item.name.trim();
        const sku = item.sku.trim();
        const description = item.description.trim();
        const basePriceValue = Number(item.basePrice);
        const buyCostValue = Number(item.buyCost);

        if (!name || !sku) return null;

        return {
          name,
          sku,
          description: description || undefined,
          basePrice: Number.isFinite(basePriceValue) ? basePriceValue : undefined,
          buyCost: Number.isFinite(buyCostValue) ? buyCostValue : undefined,
        };
      })
      .filter(Boolean);

    const productIds = createSelectedProducts.map((item) => item.id);

    const dto: CreateProviderDto = {
      ruc: createForm.ruc?.trim(),
      name: createForm.name?.trim(),
      phone: createForm.phone?.trim() || undefined,
      email: createForm.email?.trim() || undefined,
      address: createForm.address?.trim() || undefined,
      productIds: productIds.length ? productIds : undefined,
      newProducts: newProducts.length ? (newProducts as CreateProviderDto["newProducts"]) : undefined,
    };

    if (!dto.name) {
      toast.error("Complete el Nombre del proveedor");
      return;
    }

    try {
      setCreateSubmitting(true);
      await providerService.createProvider(dto);
      toast.success("Proveedor creado");
      closeCreate();
      
      // Refresh all data including providers list and lookups
      await Promise.all([
        loadProviders(),
        // Reload all lookup data
        providerService.getProvidersLookup().then(providers => {
          const safeProviders = Array.isArray(providers)
            ? uniqueBy(providers, (item) => item.name?.trim().toLowerCase())
            : [];
          setProvidersLookup(safeProviders);
        }),
        providerService.getProvidersRucLookup().then(rucs => {
          const safeRucs = Array.isArray(rucs)
            ? uniqueBy(rucs, (item) => item.ruc?.trim())
            : [];
          setProvidersRucLookup(safeRucs);
        })
      ]);
    } catch (error: any) {
      console.error(error);
      
      // Manejo específico de errores 403 (permisos)
      if (error?.response?.status === 403) {
        toast.error("No tienes permisos para crear proveedores");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Error al crear proveedor");
      }
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
    if (!detail || !selectedProviderId) return false;

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
      return true;
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
      await loadProviders();
      return true;
    } catch (error: any) {
      console.error(error);
      
      // Manejo específico de errores 403 (permisos)
      if (error?.response?.status === 403) {
        toast.error("No tienes permisos para actualizar proveedores");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Error al actualizar proveedor");
      }
      return false;
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
      
      // Manejo específico de errores 403 (permisos)
      if (error?.response?.status === 403) {
        toast.error("No tienes permisos para eliminar proveedores");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Error al eliminar proveedor");
      }
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
    if (!selectedProviderId) return false;

    const productIds = Array.from(
      new Set(localProviderProducts.map((pp) => pp.product?.id).filter(Boolean) as string[])
    );

    const newProducts = editNewProducts
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        sku: item.sku?.trim() || undefined,
        description: item.description?.trim() || undefined,
        basePrice: item.basePrice ? Number(item.basePrice) : undefined,
        buyCost: item.buyCost ? Number(item.buyCost) : undefined,
      }));

    try {
      setProductsSubmitting(true);
      if (newProducts.length > 0) {
        const updated = await providerService.updateProvider(selectedProviderId, {
          newProducts,
        });
        const createdCount = (updated as { newProductsCreated?: unknown[] })?.newProductsCreated?.length ?? 0;
        if (createdCount > 0) {
          toast.success(`${createdCount} producto(s) nuevo(s) agregado(s) al catálogo`);
        }
      }
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
      setEditNewProducts([]);
      return true;
    } catch (error: any) {
      console.error(error);
      
      // Manejo específico de errores 403 (permisos)
      if (error?.response?.status === 403) {
        toast.error("No tienes permisos para gestionar productos de proveedores");
      } else {
        toast.error(error?.response?.data?.message || error?.message || "Error al guardar productos");
      }
      return false;
    } finally {
      setProductsSubmitting(false);
    }
  };

  if (!canViewSuppliers()) {
    return <AccessDeniedView />;
  }

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
                {/* Botón Crear - Solo si tiene permiso MANAGE_SUPPLIERS */}
                {canManageSuppliers() && (
                  <Button
                    onClick={openCreate}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo proveedor
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <div className="space-y-1">
                    <div className="relative invisible">
                      <span className="text-xs font-medium text-muted-foreground">Proveedor</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar proveedor..."
                        className="pl-9"
                        value={providerQuery}
                        onBlur={() => setTimeout(() => setShowProviderSuggestions(false), 150)}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setProviderQuery(nextValue);
                          setShowProviderSuggestions(nextValue.trim().length > 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const trimmed = providerQuery.trim();
                          if (!trimmed) return;
                          setProviderFilter(trimmed);
                          setProviderQuery(trimmed);
                          setShowProviderSuggestions(false);
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
                      {showProviderSuggestions && providerQuery.trim().length > 0 && filteredProviderSuggestions.length > 0 && (
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
                  </div>
                </div>

                <div className="relative">
                  <div className="space-y-1">
                    <div className="relative invisible">
                      <span className="text-xs font-medium text-muted-foreground">RUC</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="search"
                        placeholder="Filtrar por RUC..."
                        value={rucQuery}
                        onBlur={() => setTimeout(() => setShowRucSuggestions(false), 150)}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setRucQuery(nextValue);
                          setShowRucSuggestions(nextValue.trim().length > 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const trimmed = rucQuery.trim();
                          if (!trimmed) return;
                          setRucFilter(trimmed);
                          setRucQuery(trimmed);
                          setShowRucSuggestions(false);
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
                      {showRucSuggestions && rucQuery.trim().length > 0 && filteredRucSuggestions.length > 0 && (
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
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Desde</span>
                  <Input 
                    type="date" 
                    value={fromDate} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setFromDate(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                  <Input 
                    type="date" 
                    value={toDate} 
                    onClick={(e) => e.currentTarget.showPicker?.()} 
                    onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <ActiveFilters 
                hasActiveFilters={!!(providerFilter || rucFilter || fromDate || toDate)}
                onClearFilters={clearFilters}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-4">
              <span>
                Mostrando <strong>{providers.length}</strong> de <strong>{total}</strong> proveedores
                {totalPages > 1 && ` · página ${page} de ${totalPages}`}
              </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
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
                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">RUC</TableHead>
                    {/* Hide Dirección, Órdenes totales, Órdenes anuladas, Creación in mobile */}
                    <TableHead className="hidden sm:table-cell min-w-[200px]">Dirección</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[120px] text-center">Órdenes totales</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[120px] text-center">Órdenes anuladas</TableHead>
                    <TableHead className="hidden xl:table-cell min-w-[140px]">Creación</TableHead>
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
                      <TableCell className="hidden sm:table-cell">{p.address}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">{p.activeOrdersCount ?? 0}</TableCell>
                      <TableCell className="hidden lg:table-cell text-center">{p.annulledOrdersCount ?? 0}</TableCell>
                      <TableCell className="hidden xl:table-cell">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</TableCell>
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
        <DialogContent
          className="max-h-[85vh] sm:min-h-[65vh] p-0 overflow-hidden"
          style={{ width: "min(920px, calc(100vw - 2rem))", maxWidth: "920px" }}
        >
          <div className="flex flex-col max-h-[85vh] sm:min-h-[65vh]">
            <div className="shrink-0 p-6 pb-4 border-b bg-linear-to-b from-background to-muted/20">
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shadow-sm">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Detalle de proveedor</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Revisa y administra la información registrada.</p>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-linear-to-b from-muted/5 to-background">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !detail ? (
                <div className="text-center py-6 text-muted-foreground">Sin información</div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold tracking-tight">Datos generales</h3>
                    </div>
                    <div className="rounded-xl border bg-muted/20/50 backdrop-blur-sm p-5 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nombre</label>
                          <Input
                            value={isEditing ? (editForm.name ?? "") : (detail.name ?? "")}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            disabled={!isEditing}
                            className={
                              isEditing
                                ? "bg-success/10 border-success/30 focus-visible:ring-success/40"
                                : undefined
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">RUC</label>
                          <Input value={detail.ruc ?? ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Teléfono</label>
                          <Input
                            value={isEditing ? (editForm.phone ?? "") : (detail.phone ?? "")}
                            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                            disabled={!isEditing}
                            className={
                              isEditing
                                ? "bg-success/10 border-success/30 focus-visible:ring-success/40"
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
                                ? "bg-success/10 border-success/30 focus-visible:ring-success/40"
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
                                ? "bg-success/10 border-success/30 focus-visible:ring-success/40"
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5">
                        <Save className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold tracking-tight">Auditoría</h3>
                    </div>
                    <div className="rounded-xl border bg-muted/20/50 backdrop-blur-sm p-5 shadow-sm">
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
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">Productos que abastece</h3>
                          <span className="text-xs text-muted-foreground">({localProviderProducts.length})</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2" />
                    </div>

                    {isEditing && canManageSuppliers() && (
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
                          <div className="flex w-full flex-col gap-2">
                            <Button
                              className="w-full"
                              onClick={addSelectedProduct}
                              disabled={!selectedProductId || productsSubmitting}
                            >
                              Agregar
                            </Button>
                            <QRScanner
                              onScan={handleQRScanProvider}
                              enabled={isDetailOpen && isEditing}
                              mode="both"
                              buttonLabel="Escanear"
                              className="w-full justify-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="rounded-lg border bg-background shadow-sm flex flex-col min-h-0 mt-4">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevos productos</span>
                            <span className="text-xs text-muted-foreground">(opcionales)</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEditNewProduct}
                            disabled={productsSubmitting}
                            className="h-7"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Agregar producto nuevo
                          </Button>
                        </div>
                        {editNewProducts.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground">
                            Agrega productos nuevos que no estén en el catálogo.
                          </div>
                        ) : (
                          <div className="divide-y max-h-60 overflow-y-auto">
                            {editNewProducts.map((item) => (
                              <div key={item.tempId} className="p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-muted-foreground">Nuevo producto</div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeEditNewProduct(item.tempId)}
                                    disabled={productsSubmitting}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Nombre *</label>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateEditNewProduct(item.tempId, "name", e.target.value)}
                                      disabled={productsSubmitting}
                                      placeholder="Nombre del producto"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium">SKU</label>
                                    <Input
                                      value={item.sku ?? ""}
                                      onChange={(e) => updateEditNewProduct(item.tempId, "sku", e.target.value)}
                                      disabled={productsSubmitting}
                                      placeholder="SKU-0001"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-xs font-medium">Descripción</label>
                                    <Input
                                      value={item.description ?? ""}
                                      onChange={(e) => updateEditNewProduct(item.tempId, "description", e.target.value)}
                                      disabled={productsSubmitting}
                                      placeholder="Descripción breve"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Precio base</label>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={item.basePrice ?? ""}
                                      onChange={(e) => updateEditNewProduct(item.tempId, "basePrice", e.target.value)}
                                      disabled={productsSubmitting}
                                      placeholder="0.00"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Costo</label>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={item.buyCost ?? ""}
                                      onChange={(e) => updateEditNewProduct(item.tempId, "buyCost", e.target.value)}
                                      disabled={productsSubmitting}
                                      placeholder="0.00"
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border bg-muted/20/50 backdrop-blur-sm p-4 shadow-sm">
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
                              {isEditing && canManageSuppliers() && (
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

            <div className="shrink-0 border-t bg-muted/30 px-8 py-12">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                {canDeleteSuppliers() && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteProvider}
                    disabled={detailLoading || editSubmitting}
                    className="sm:mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  {canManageSuppliers() && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!detail) return;
                        if (!isEditing) {
                          setIsEditing(true);
                          await ensureLookupLoaded();
                          return;
                        }
                        const editOk = await handleSaveEdit();
                        const productsOk = await handleSaveProducts();
                        if (editOk && productsOk) {
                          setIsEditing(false);
                        }
                      }}
                      disabled={detailLoading || editSubmitting || productsSubmitting}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {isEditing ? "Guardar cambios" : "Editar"}
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
        <DialogContent
          className="max-h-[96vh] sm:h-[75vh] sm:max-h-[75vh] p-0 overflow-hidden"
          style={{ width: "min(1260px, calc(100vw - 2rem))", maxWidth: "1260px" }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex flex-col max-h-[96vh] sm:h-[75vh] sm:max-h-[75vh] min-h-0">

            {/* ── Header ── */}
            <div className="shrink-0 p-6 pb-4 border-b bg-linear-to-b from-background to-muted/20">
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shadow-sm">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Nuevo proveedor</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Completa los datos y opcionalmente asigna productos.</p>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-linear-to-b from-muted/5 to-background">

              {/* Móvil: tabs */}
              <div className="sm:hidden">
                <Tabs
                  value={createActiveTab}
                  onValueChange={(value) => setCreateActiveTab(value as "details" | "products")}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 w-full h-11 bg-muted/50 rounded-lg p-1">
                    <TabsTrigger value="details" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      <Users className="h-3.5 w-3.5" />
                      Proveedor
                    </TabsTrigger>
                    <TabsTrigger value="products" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      <Package className="h-3.5 w-3.5" />
                      Productos
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="mt-4">
                    <div className="rounded-xl border bg-muted/20/50 backdrop-blur-sm p-5 shadow-sm">
                      {renderCreateProviderFields()}
                    </div>
                  </TabsContent>
                  <TabsContent value="products" className="mt-4">
                    {renderCreateProductsSection()}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Desktop: dos columnas */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_1px_1fr] gap-0">
                <div className="space-y-5 pr-8">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold tracking-tight">Datos del proveedor</h4>
                  </div>
                  <div className="rounded-xl border bg-muted/20/50 backdrop-blur-sm p-5 shadow-sm">
                    {renderCreateProviderFields()}
                  </div>
                </div>

                <div className="w-0.5 h-full bg-border mx-4 min-h-[400px]" />

                <div className="space-y-5 pl-8">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold tracking-tight">Productos que abastece</h4>
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </div>
                  {renderCreateProductsSection()}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 border-t bg-muted/30 px-6 pb-12 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {createSelectedProducts.length > 0 || createNewProducts.length > 0
                      ? `${createSelectedProducts.length} catálogo · ${createNewProducts.length} nuevo${createNewProducts.length !== 1 ? "s" : ""}`
                      : "Sin productos asignados"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeCreate} disabled={createSubmitting} className="hover:bg-accent/50">
                    Cancelar
                  </Button>
                  <Button onClick={submitCreate} disabled={createSubmitting} className="bg-primary hover:bg-primary/90">
                    {createSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {createSubmitting ? "Creando..." : "Crear proveedor"}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
