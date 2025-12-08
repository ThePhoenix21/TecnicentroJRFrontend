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
  const canManageInventory = hasPermission("MANAGE_INVENTORY") || hasPermission("inventory.manage");
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

  if (selectedSession) {
    if (!canManageInventory) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Inventario Físico</h1>
          <p className="text-muted-foreground text-sm">
            No tienes permisos para gestionar sesiones de inventario físico.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-6 p-6">
        <ActiveSessionView 
            session={selectedSession} 
            onSessionClosed={() => {
                loadSessions();
                setSelectedSession(null); // Volver a la lista al cerrar
            }}
            onBack={() => {
                setSelectedSession(null);
                loadSessions();
            }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario Físico</h1>
          <p className="text-muted-foreground">
            {canManageInventory
              ? "Gestiona las sesiones de conteo mensual."
              : "Puedes consultar el historial de sesiones, pero no crear ni modificar sesiones."}
          </p>
        </div>
        {canManageInventory && <CreateSessionDialog onSessionCreated={loadSessions} />}
      </div>

      <InventoryCountSessionList
        sessions={sessions}
        isLoading={isLoading}
        onSelectSession={(session) => {
          if (!canManageInventory) return;
          setSelectedSession(session);
        }}
      />
    </div>
  );
}
