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

interface ActiveSessionViewProps {
  session: InventoryCountSession;
  onSessionClosed: () => void;
  onBack: () => void;
}

export function ActiveSessionView({ session, onSessionClosed, onBack }: ActiveSessionViewProps) {
  const { user, isAdmin, canIssuePdf } = useAuth(); // Usar isAdmin
  const { toast } = useToast();
  
  // Calcular si la sesión está abierta basado en finalizedAt (si es null, está abierta)
  const isOpen = !session.finalizedAt;

  type StockProduct = StoreProductStockItem & { id: string };
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [countedItems, setCountedItems] = useState<InventoryCountItem[]>(session.items || []);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClosing, setIsClosing] = useState(false);
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
    setInputValues(prev => ({
      ...prev,
      [storeProductId]: value
    }));
  };

  const saveCount = async (storeProductId: string) => {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{session.name}</h2>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? 'En Progreso' : 'Cerrada'}
            </Badge>
            <span className="text-sm">
                Creada el {new Date(session.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={onBack}>Volver</Button>
          {isOpen && isAdmin && (
            <Button onClick={handleCloseSession} disabled={isClosing}>
              {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Finalizar Inventario
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Conteo de Productos</CardTitle>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="hide-zero-stock"
                  checked={hideZeroStock}
                  onCheckedChange={(checked) => {
                    setHideZeroStock(checked === true);
                  }}
                />
                <label htmlFor="hide-zero-stock">Ocultar productos sin stock</label>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar producto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Producto</TableHead>
                                <TableHead className="text-center">Stock Teórico</TableHead>
                                <TableHead className="text-center w-[150px]">Stock Físico</TableHead>
                                <TableHead className="text-center">Diferencia</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
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
                                    <TableRow key={product.id} className={rowClass}>
                                        <TableCell className="font-medium">
                                            {product.name}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">
                                            {product.stock}
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative flex items-center justify-center">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    className={`text-center font-bold ${
                                                        !hasValidInput ? 'border-destructive ring-1 ring-destructive' : 
                                                        countItem ? 'border-primary' : ''
                                                    }`}
                                                    value={inputValues[product.id] ?? ''}
                                                    onChange={(e) => handleInputChange(product.id, e.target.value)}
                                                    onBlur={() => {
                                                        const currentVal = inputValues[product.id];
                                                        // Guardar solo si no está vacío
                                                        if (currentVal !== undefined && currentVal !== '') {
                                                            // Verificar contra valor guardado si existe
                                                            if (!countItem || parseInt(currentVal) !== countItem.physicalStock) {
                                                                saveCount(product.id);
                                                            }
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    disabled={!isOpen}
                                                    placeholder="-"
                                                />
                                                {isSaving && (
                                                    <Loader2 className="absolute right-2 h-3 w-3 animate-spin text-primary" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {hasValidInput && countItem ? (
                                                <span className={`font-bold ${
                                                    difference === 0 ? "text-green-600" :
                                                    difference < 0 ? "text-red-600" : "text-yellow-600"
                                                }`}>
                                                    {difference > 0 ? '+' : ''}{difference}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {hasValidInput && countItem ? (
                                                difference === 0 ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-200">Correcto</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-200">Descuadre</Badge>
                                                )
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>
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
    </div>
  );
}
