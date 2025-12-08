"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { InventoryMovement } from "@/types/inventory.types";
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
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryMovementHistoryProps {
  refreshTrigger?: number; // Prop to force refresh
}

export function InventoryMovementHistory({ refreshTrigger }: InventoryMovementHistoryProps) {
  const { currentStore } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMovements = useCallback(async () => {
    if (!currentStore?.id) return;

    setIsLoading(true);
    try {
      const data = await inventoryService.getMovimientos({
        storeId: currentStore.id
      });
      setMovements(data);
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements, refreshTrigger]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "INCOMING":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Entrada</Badge>;
      case "OUTGOING":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Salida</Badge>;
      case "SALE":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Venta</Badge>;
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Historial de Movimientos</CardTitle>
        <Button variant="ghost" size="icon" onClick={loadMovements} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
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
                      <div className="font-medium">{movement.storeProduct?.product?.name || "Producto desconocido"}</div>
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
                        {movement.user?.name || movement.createdBy?.name || 'Sistema'}
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
      </CardContent>
    </Card>
  );
}
