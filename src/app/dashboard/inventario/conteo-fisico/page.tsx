"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { InventoryCountSession } from "@/types/inventory.types";
import { InventoryCountSessionList } from "@/components/inventory/InventoryCountSessionList";
import { CreateSessionDialog } from "@/components/inventory/CreateSessionDialog";
import { ActiveSessionView } from "@/components/inventory/ActiveSessionView";

export default function InventoryCountPage() {
  const { currentStore, hasPermission } = useAuth();
  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const canStartPhysicalInventory = hasPermission("START_PHYSICAL_INVENTORY");
  const [sessions, setSessions] = useState<InventoryCountSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<InventoryCountSession | null>(null);

  const loadSessions = useCallback(async () => {
    if (!currentStore?.id) return;
    setIsLoading(true);
    try {
      const data = await inventoryService.getSessions(currentStore.id);
      setSessions(data);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (!canViewInventory) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Inventario Físico</h1>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para ver el inventario.
        </p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <ActiveSessionView
        session={selectedSession}
        canManageSession={canStartPhysicalInventory}
        onSessionClosed={() => {
          setSelectedSession(null);
          loadSessions();
        }}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario Físico</h1>
          <p className="text-muted-foreground">
            {canStartPhysicalInventory
              ? "Gestiona las sesiones de conteo mensual."
              : "Puedes consultar el historial de sesiones, pero no crear ni modificar sesiones."}
          </p>
        </div>
        {canStartPhysicalInventory && <CreateSessionDialog onSessionCreated={loadSessions} />}
      </div>

      <InventoryCountSessionList
        sessions={sessions}
        isLoading={isLoading}
        onSelectSession={(session) => {
          setSelectedSession(session);
        }}
      />
    </div>
  );
}
