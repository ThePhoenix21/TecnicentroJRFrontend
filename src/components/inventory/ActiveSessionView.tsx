"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { storeProductService } from "@/services/store-product.service";
import { InventoryCountSession, InventoryCountItem, InventorySessionReport } from "@/types/inventory.types";
import { StoreProductStockItem } from "@/types/store-product.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PDFViewer } from "@react-pdf/renderer";
import InventoryReportPDF from "./InventoryReportPDF";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveSessionViewProps {
  session: InventoryCountSession;
  onSessionClosed: () => void;
  onBack: () => void;
  canManageSession?: boolean;
}

export function ActiveSessionView({
  session,
  onSessionClosed,
  onBack,
  canManageSession = false,
}: ActiveSessionViewProps) {
  const { isAdmin, canIssuePdf } = useAuth();
  const canManage = isAdmin || canManageSession;
  const { toast } = useToast();
  
  // Calcular si la sesión está abierta basado en finalizedAt (si es null, está abierta)
  const isOpen = !session.finalizedAt;

  type StockProduct = StoreProductStockItem & { id: string };
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [countedItems, setCountedItems] = useState<InventoryCountItem[]>(session.items || []);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  
  // Estado para el reporte PDF
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<InventorySessionReport | null>(null);
  
  // Estado para manejar los valores temporales de los inputs
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [hideZeroStock, setHideZeroStock] = useState(true);

  // Cargar productos y reporte actualizado
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, reportData] = await Promise.all([
        storeProductService.getStoreProductsStock(session.storeId),
        inventoryService.getSessionReport(session.id)
      ]);
      
      const normalizedProducts: StockProduct[] = (productsData || [])
        .map((item) => {
          const id = item.id || item.storeProductId;
          if (!id) return null;
          return {
            ...item,
            id,
          } as StockProduct;
        })
        .filter((item): item is StockProduct => Boolean(item));

      setProducts(normalizedProducts);
      setCountedItems(reportData.items || []);
      
      // Inicializar valores de inputs con los conteos existentes
      const initialValues: Record<string, string> = {};
      reportData.items?.forEach(item => {
        initialValues[item.storeProductId] = item.physicalStock.toString();
      });
      setInputValues(initialValues);
      
    } catch (error) {
      console.error("Error loading session data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la sesión.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session.id, session.storeId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejar cambio en input de conteo (solo estado local)
  const handleInputChange = (storeProductId: string, value: string) => {
    if (!canManage || !isOpen) return;
    setInputValues(prev => ({
      ...prev,
      [storeProductId]: value
    }));
  };

  const handleInputBlur = (storeProductId: string, countItem?: InventoryCountItem) => {
    if (!canManage || !isOpen) return;
    const currentVal = inputValues[storeProductId];
    if (currentVal === undefined || currentVal === '') return;

    if (!countItem || parseInt(currentVal) !== countItem.physicalStock) {
      saveCount(storeProductId);
    }
  };

  const saveCount = async (storeProductId: string) => {
    if (!canManage || !isOpen) return;
    const valueStr = inputValues[storeProductId];
    if (!valueStr || valueStr === '') return;
    
    const value = parseInt(valueStr);
    if (isNaN(value) || value < 0) return;

    setSavingItems(prev => new Set(prev).add(storeProductId));
    try {
      // Verificar si ya existe item
      const existingItem = countedItems.find(i => i.storeProductId === storeProductId);
      
      let result;
      if (existingItem) {
        result = await inventoryService.updateCountItem(existingItem.id, { physicalStock: value });
      } else {
        result = await inventoryService.addCountItem(session.id, { storeProductId, physicalStock: value });
      }

      // Actualizar lista
      setCountedItems(prev => {
        const filtered = prev.filter(i => i.storeProductId !== storeProductId);
        return [...filtered, result];
      });

      toast({
        title: "Guardado",
        description: "Conteo actualizado.",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error saving count:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el conteo.",
        variant: "destructive",
      });
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev);
        next.delete(storeProductId);
        return next;
      });
    }
  };

  const handleCloseSession = async () => {
    if (!canManage || !isOpen) return;
    // Validar que todos los productos tengan un valor válido en los inputs
    // Un producto está pendiente si su valor en inputValues es undefined o cadena vacía
    const pendingProducts = products.filter(p => {
      const val = inputValues[p.id];
      return val === undefined || val === null || val.trim() === '';
    });
    
    if (pendingProducts.length > 0) {
      toast({
        title: "No se puede finalizar",
        description: `Aún faltan ${pendingProducts.length} productos por contar. Todos los campos deben tener un número válido (0 o mayor).`,
        variant: "destructive",
      });
      return;
    }

    setShowCloseConfirm(true);
  };

  const closeSessionOnly = async () => {
    if (!confirm("¿Estás seguro de finalizar el inventario? Esto cerrará la sesión y generará el reporte final.")) return;

    setIsClosing(true);
    try {
      const report = await inventoryService.closeSession(session.id);
      
      toast({
        title: "Inventario finalizado",
        description: "La sesión se ha cerrado correctamente.",
      });

      if (canIssuePdf) {
        // Mostrar el reporte
        setReportData(report);
        setShowReport(true);

        // No llamamos a onSessionClosed() aquí, esperamos a que el usuario cierre el reporte
      } else {
        onSessionClosed();
      }
    } catch (error) {
      console.error("Error closing session:", error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la sesión.",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };

  const reconcileAndCloseSession = async () => {
    if (!canManage || !isOpen) return;
    if (!confirm("¿Confirmas que deseas cuadrar el inventario teórico con el físico? Se generarán movimientos automáticamente.")) return;

    setIsReconciling(true);
    try {
      const differences = countedItems
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          storeProductId: item.storeProductId,
          difference: item.difference,
        }));

      if (differences.length > 0) {
        await Promise.all(
          differences.map((d) =>
            inventoryService.createMovimiento({
              storeProductId: d.storeProductId,
              type: "ADJUST",
              quantity: d.difference,
              description: `Cuadre automático por cierre de inventario: ${session.name}`,
            })
          )
        );
      }

      const report = await inventoryService.closeSession(session.id);

      toast({
        title: "Inventario finalizado",
        description:
          differences.length > 0
            ? `Se cuadró el inventario con ${differences.length} movimiento(s) y se cerró la sesión.`
            : "No había descuadres. La sesión se cerró correctamente.",
      });

      if (canIssuePdf) {
        setReportData(report);
        setShowReport(true);
      } else {
        onSessionClosed();
      }
    } catch (error) {
      console.error("Error reconciling/closing session:", error);
      toast({
        title: "Error",
        description: "No se pudo cuadrar y finalizar la sesión.",
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Filtrar productos
  useEffect(() => {
    if (!hideZeroStock) return;

    setInputValues(prev => {
      let changed = false;
      const next = { ...prev };

      products.forEach(product => {
        if (product.stock === 0 && next[product.id] !== "0") {
          next[product.id] = "0";
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [hideZeroStock, products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (!hideZeroStock || p.stock !== 0);
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header con información distribuida */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{session.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant={isOpen ? 'default' : 'secondary'} className="text-xs">
                {isOpen ? 'En Progreso' : 'Cerrada'}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                Creada el {new Date(session.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="text-xs">
              <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onBack} className="text-xs">Volver</Button>
            {isOpen && canManage && (
              <Button size="sm" onClick={handleCloseSession} disabled={isClosing || isReconciling} className="text-xs">
                {isClosing || isReconciling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                <span className="hidden sm:inline">Finalizar</span>
                <span className="sm:hidden">Finalizar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="w-[70vw] mx-auto">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base sm:text-lg">Conteo de Productos</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Checkbox
                  id="hide-zero-stock"
                  checked={hideZeroStock}
                  onCheckedChange={(checked) => {
                    setHideZeroStock(checked === true);
                  }}
                  className="h-3 w-3 sm:h-4 sm:w-4"
                />
                <label htmlFor="hide-zero-stock" className="text-xs sm:text-sm">Ocultar productos sin stock</label>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar producto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 sm:pl-8 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="h-8 sm:h-10">
                                <TableHead className="text-xs sm:text-sm font-medium">Producto</TableHead>
                                <TableHead className="text-center text-xs sm:text-sm font-medium">Stock Teórico</TableHead>
                                <TableHead className="text-center text-xs sm:text-sm font-medium">Stock Físico</TableHead>
                                <TableHead className="text-center text-xs sm:text-sm font-medium">Diferencia</TableHead>
                                <TableHead className="text-right text-xs sm:text-sm font-medium">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map(product => {
                                const countItem = countedItems.find(i => i.storeProductId === product.id);
                                const isSaving = savingItems.has(product.id);
                                
                                // Valor actual del input (lo que ve el usuario)
                                const inputValue = inputValues[product.id];
                                // Es válido visualmente si no es undefined y no es cadena vacía
                                const hasValidInput = inputValue !== undefined && inputValue !== '';
                                
                                // Usar diferencia solo si hay input válido Y tenemos item guardado
                                // Si el input cambió y no se ha guardado (ej: borrado), countItem tiene valor viejo
                                const difference = (hasValidInput && countItem) ? countItem.difference : 0;
                                
                                // Determinar estado visual
                                // Si no hay input válido -> Pendiente (sin color o alerta)
                                // Si hay input válido y coinciden -> Color correspondiente
                                const rowClass = !hasValidInput 
                                  ? "hover:bg-transparent" // Sin color si está vacío/inválido
                                  : difference === 0
                                    ? "bg-green-500/5 hover:bg-green-500/5"
                                    : difference < 0
                                      ? "bg-red-200/15 hover:bg-red-200/15"
                                      : "bg-yellow-500/32 hover:bg-yellow-500/32";

                                return (
                                    <TableRow key={product.id} className={`${rowClass} h-10 sm:h-12`}>
                                        <TableCell className="text-sm sm:text-base font-medium py-2 px-2 sm:px-4">
                                            {product.name}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground py-2 px-1 sm:px-2 text-sm sm:text-base">
                                            {product.stock}
                                        </TableCell>
                                        <TableCell className="text-center py-2 px-1 sm:px-2">
                                            <div className="relative flex items-center justify-center">
                                              <Input
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                className={cn(
                                                  "text-center font-bold text-sm sm:text-base h-8 sm:h-10",
                                                  (!hasValidInput && canManage) && "border-destructive ring-1 ring-destructive",
                                                  countItem && canManage && "border-primary",
                                                  (!canManage || !isOpen) && "bg-muted text-muted-foreground cursor-not-allowed"
                                                )}
                                                value={inputValues[product.id] ?? ''}
                                                onChange={(e) => handleInputChange(product.id, e.target.value)}
                                                onBlur={() => handleInputBlur(product.id, countItem)}
                                                onKeyDown={(e) => {
                                                  if (!canManage) return;
                                                  if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                  }
                                                }}
                                                disabled={!canManage || !isOpen}
                                              />
                                              {isSaving && canManage && (
                                                <Loader2 className="absolute right-1 sm:right-2 h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin text-primary" />
                                              )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2 px-1 sm:px-2">
                                            {hasValidInput && countItem ? (
                                                <span className={`font-bold text-sm sm:text-base ${
                                                    difference === 0 ? "text-green-600" :
                                                    difference < 0 ? "text-red-600" : "text-yellow-600"
                                                }`}>
                                                    {difference > 0 ? '+' : ''}{difference}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right py-2 px-2 sm:px-4">
                                            {hasValidInput && countItem ? (
                                                difference === 0 ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 text-xs">Correcto</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-200 text-xs">Descuadre</Badge>
                                                )
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground text-xs">Pendiente</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>

      {/* Diálogo del Reporte PDF */}
      <Dialog open={showReport} onOpenChange={(open) => {
        if (!open) {
          setShowReport(false);
          onSessionClosed(); // Llamar al callback cuando se cierre el reporte
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reporte de Cierre de Inventario</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[500px]">
            {canIssuePdf && reportData && (
              <PDFViewer width="100%" height="100%" className="w-full h-full rounded-md border">
                <InventoryReportPDF data={reportData} />
              </PDFViewer>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowReport(false);
              onSessionClosed();
            }}>
              Cerrar y Volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseConfirm} onOpenChange={(open) => {
        if (!canManage || isClosing || isReconciling) return;
        setShowCloseConfirm(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              ¿Deseas cuadrar el inventario teórico con el conteo físico en caso de que haya descuadres?
            </p>
            <p>
              Si aceptas, se generarán movimientos de inventario automáticamente antes de cerrar la sesión.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCloseConfirm(false);
              }}
              disabled={isClosing || isReconciling}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setShowCloseConfirm(false);
                await closeSessionOnly();
              }}
              disabled={isClosing || isReconciling}
            >
              Cerrar sin cuadrar
            </Button>
            <Button
              onClick={async () => {
                setShowCloseConfirm(false);
                await reconcileAndCloseSession();
              }}
              disabled={isClosing || isReconciling}
            >
              Cuadrar y cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
