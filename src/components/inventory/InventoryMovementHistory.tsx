"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { inventoryService } from "@/services/inventory.service";
import type {
  InventoryMovement,
  InventoryMovementType,
  ProductLookupItem,
  UserLookupItem,
} from "@/types/inventory.types";
import { uniqueBy } from "@/utils/array";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryMovementHistoryProps {
  refreshTrigger?: number; // Prop to force refresh
}

export function InventoryMovementHistory({ refreshTrigger }: InventoryMovementHistoryProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [productQuery, setProductQuery] = useState("");
  const [productNameFilter, setProductNameFilter] = useState("");
  const [productsLookup, setProductsLookup] = useState<ProductLookupItem[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  const [usersLookup, setUsersLookup] = useState<UserLookupItem[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [userQuery, setUserQuery] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  const productFilterRef = useRef<HTMLDivElement | null>(null);
  const userFilterRef = useRef<HTMLDivElement | null>(null);

  const [type, setType] = useState<InventoryMovementType | "ALL">("ALL");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const productNameFilterRef = useRef(productNameFilter);
  const userIdRef = useRef(userId);
  const typeRef = useRef(type);
  const fromDateRef = useRef(fromDate);
  const toDateRef = useRef(toDate);
  const pageSizeRef = useRef(pageSize);
  const loadMovementsRef = useRef<((targetPage?: number) => Promise<void>) | null>(null);

  const toUtcRange = (from: string, to: string) => {
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;
    return { fromDate, toDate };
  };

  const filteredProductSuggestions = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return productsLookup;
    return productsLookup.filter((item) => item.name.toLowerCase().includes(query));
  }, [productQuery, productsLookup]);

  const filteredUserSuggestions = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return usersLookup;
    return usersLookup.filter((item) => item.name.toLowerCase().includes(query));
  }, [userQuery, usersLookup]);

  const clearFilters = () => {
    setProductQuery("");
    setProductNameFilter("");
    setShowProductSuggestions(false);
    setUserId("");
    setUserQuery("");
    setShowUserSuggestions(false);
    setType("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const loadMovements = useCallback(async (targetPage?: number) => {
    await loadMovementsRef.current?.(targetPage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (productFilterRef.current && !productFilterRef.current.contains(target)) {
        setShowProductSuggestions(false);
      }
      if (userFilterRef.current && !userFilterRef.current.contains(target)) {
        setShowUserSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    productNameFilterRef.current = productNameFilter;
  }, [productNameFilter]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    typeRef.current = type;
  }, [type]);

  useEffect(() => {
    fromDateRef.current = fromDate;
  }, [fromDate]);

  useEffect(() => {
    toDateRef.current = toDate;
  }, [toDate]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    loadMovementsRef.current = async (targetPage?: number) => {
      setIsLoading(true);
      try {
        const pageToLoad = targetPage ?? page;
        const from = fromDateRef.current;
        const to = toDateRef.current;
        const range = from && to ? toUtcRange(from, to) : null;

        const response = await inventoryService.getInventoryMovements({
          page: pageToLoad,
          pageSize: pageSizeRef.current,
          name: productNameFilterRef.current.trim() || undefined,
          type: typeRef.current === "ALL" ? undefined : (typeRef.current as InventoryMovementType),
          userId: userIdRef.current || undefined,
          fromDate: range?.fromDate,
          toDate: range?.toDate,
        });

        setMovements(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setPage(response.page || pageToLoad);
      } catch (error) {
        console.error("Error loading movements:", error);
        toast.error((error as Error)?.message || "Error al cargar movimientos");
      } finally {
        setIsLoading(false);
      }
    };
  }, [page]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await inventoryService.getUsersLookup();
        const safe = Array.isArray(users) ? uniqueBy(users, (u) => u.name?.trim().toLowerCase()) : [];
        setUsersLookup(safe);
      } catch (error) {
        console.error(error);
        toast.error((error as Error)?.message || "No se pudieron cargar los usuarios");
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const items = await inventoryService.getProductsLookup("");
        const safe = Array.isArray(items) ? uniqueBy(items, (i) => i.name?.trim().toLowerCase()) : [];
        setProductsLookup(safe);
      } catch (error) {
        console.error(error);
        toast.error((error as Error)?.message || "No se pudieron cargar los productos");
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    loadMovements(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadMovements(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [productNameFilter, type, userId, fromDate, toDate, loadMovements]);

  useEffect(() => {
    loadMovements(page);
  }, [page, loadMovements]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "INCOMING":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Entrada</Badge>;
      case "OUTGOING":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Salida</Badge>;
      case "SALE":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Venta</Badge>;
      case "RETURN":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Devolución</Badge>;
      case "ADJUST":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ajuste</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch (error) {
      return "-";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Historial de Movimientos</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => loadMovements(1)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              <div className="relative" ref={productFilterRef}>
                <label className="text-sm text-muted-foreground">Producto</label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setShowProductSuggestions(true);
                      if (!e.target.value) {
                        setProductNameFilter("");
                      }
                    }}
                    onFocus={() => setShowProductSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setShowProductSuggestions(false);
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Buscar producto..."
                    className="pl-8"
                  />
                  {productQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductQuery("");
                        setProductNameFilter("");
                        setShowProductSuggestions(false);
                        setPage(1);
                        loadMovements(1);
                      }}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showProductSuggestions && filteredProductSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                    <div className="max-h-56 overflow-auto p-1">
                      {filteredProductSuggestions.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setProductQuery(item.name);
                            setProductNameFilter(item.name);
                            setShowProductSuggestions(false);
                            setPage(1);
                            loadMovements(1);
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Tipo</label>
                <div className="mt-1">
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="INCOMING">Entrada</SelectItem>
                      <SelectItem value="OUTGOING">Salida</SelectItem>
                      <SelectItem value="SALE">Venta</SelectItem>
                      <SelectItem value="RETURN">Devolución</SelectItem>
                      <SelectItem value="ADJUST">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div ref={userFilterRef}>
                <label className="text-sm text-muted-foreground">Usuario</label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userQuery}
                    onChange={(e) => {
                      setUserQuery(e.target.value);
                      setShowUserSuggestions(true);
                      if (!e.target.value) {
                        setUserId("");
                      }
                    }}
                    onFocus={() => setShowUserSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setShowUserSuggestions(false);
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Buscar usuario..."
                    className="pl-8"
                  />
                  {userQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserQuery("");
                        setUserId("");
                        setShowUserSuggestions(false);
                        setPage(1);
                        loadMovements(1);
                      }}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {showUserSuggestions && filteredUserSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                      <div className="max-h-56 overflow-auto p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserQuery("");
                            setUserId("");
                            setShowUserSuggestions(false);
                            setPage(1);
                            loadMovements(1);
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-muted"
                        >
                          Todos
                        </button>
                        {filteredUserSuggestions.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              setUserQuery(item.name);
                              setUserId(item.id);
                              setShowUserSuggestions(false);
                              setPage(1);
                              loadMovements(1);
                            }}
                            className="w-full text-left px-3 py-2 rounded hover:bg-muted"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">Desde</label>
                  <Input 
                  className="mt-1" 
                  type="date" 
                  value={fromDate} 
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => setFromDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Hasta</label>
                  <Input 
                    className="mt-1" 
                    type="date" 
                    value={toDate} 
                    onClick={(e) => e.currentTarget.showPicker?.()} 
                    onChange={(e) => setToDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            {total} movimientos
          </div>
        </div>

        <div className="rounded-md border overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay movimientos registrados en este periodo.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(movement.date || movement.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.name || movement.storeProduct?.product?.name || "Producto desconocido"}</div>
                    </TableCell>
                    <TableCell>{getTypeBadge(movement.type)}</TableCell>
                    <TableCell className="text-right font-bold">
                      {(() => {
                        const isNegative = movement.type === 'OUTGOING' || movement.type === 'SALE' || (movement.type === 'ADJUST' && movement.quantity < 0);
                        const colorClass = isNegative ? 'text-red-600' : movement.type === 'ADJUST' ? 'text-yellow-600' : 'text-green-600';
                        const sign = isNegative ? '-' : '+';
                        return (
                          <span className={colorClass}>
                            {sign}{Math.abs(movement.quantity)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {movement.userName || movement.user?.name || movement.createdBy?.name || 'Sistema'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {movement.description || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={isLoading || page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
