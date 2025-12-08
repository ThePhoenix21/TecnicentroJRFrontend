"use client";

import { useState, useEffect } from "react";
import { inventoryService } from "@/services/inventory.service";
import { InventoryMovement } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProductHistoryProps {
  storeProductId: string;
}

export function ProductHistory({ storeProductId }: ProductHistoryProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeProductId) {
      loadHistory();
    }
  }, [storeProductId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getMovimientosByProduct(storeProductId);
      setMovements(data.slice(0, 5)); // Mostrar solo los últimos 5
    } catch (error) {
      console.error("Error loading product history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2 text-center">
        No hay movimientos recientes registrados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Últimos Movimientos</h4>
      <div className="space-y-3">
        {movements.map((movement) => (
          <div key={movement.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${
                movement.type === 'INCOMING' ? 'bg-green-100 text-green-600' :
                movement.type === 'OUTGOING' ? 'bg-red-100 text-red-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                {movement.type === 'INCOMING' ? <ArrowDown className="h-3 w-3" /> :
                 movement.type === 'OUTGOING' ? <ArrowUp className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
              </div>
              <div>
                <p className="font-medium">
                  {movement.type === 'INCOMING' ? 'Entrada' :
                   movement.type === 'OUTGOING' ? 'Salida' : 'Ajuste'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {movement.createdAt
                    ? format(new Date(movement.createdAt), "dd MMM HH:mm", { locale: es })
                    : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-bold ${
                movement.type === 'INCOMING' ? 'text-green-600' :
                movement.type === 'OUTGOING' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {movement.type === 'OUTGOING' ? '-' : '+'}{movement.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
