"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { InventoryMovementForm } from "@/components/inventory/InventoryMovementForm";
import { InventoryMovementHistory } from "@/components/inventory/InventoryMovementHistory";

export default function InventoryMovementsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { hasPermission } = useAuth();

  const canManageInventory = hasPermission("MANAGE_INVENTORY") || hasPermission("inventory.manage");

  const handleMovementCreated = () => {
    // Incrementamos el trigger para recargar la tabla
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
          <p className="text-muted-foreground">
            {canManageInventory
              ? "Registra entradas, salidas y ajustes de stock."
              : "Puedes consultar el historial de movimientos, pero no registrar nuevos movimientos."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Formulario (solo para quienes pueden gestionar inventario) */}
        {canManageInventory && (
          <div className="md:col-span-1">
            <InventoryMovementForm onSuccess={handleMovementCreated} />
          </div>
        )}

        {/* Columna Derecha: Historial (Scrollable) */}
        <div className={canManageInventory ? "md:col-span-2" : "md:col-span-3"}>
          <InventoryMovementHistory refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
