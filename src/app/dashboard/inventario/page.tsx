"use client";

import { useMemo, useState } from "react";
import { MoveHorizontal, ClipboardCheck, BarChart3 } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";

const InventoryMovements = dynamic(() => import("./movimientos/page"), {
  ssr: false,
});

const InventoryFisico = dynamic(() => import("./conteo-fisico/page"), {
  ssr: false,
});

const InventoryReportes = dynamic(() => import("./reportes/page"), {
  ssr: false,
});

export default function InventoryDashboard() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("movimientos");

  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const canManageInventory = hasPermission("MANAGE_INVENTORY") || hasPermission("inventory.manage");

  const availableTabs = useMemo(() => {
    const tabs = [
      {
        value: "movimientos",
        label: "Movimientos",
        description: "Historial y registro de entradas/salidas",
        icon: MoveHorizontal,
        disabled: false,
      },
      {
        value: "fisico",
        label: "Inventario Físico",
        description: "Conteos y ajustes mensuales",
        icon: ClipboardCheck,
        disabled: false,
      },
      {
        value: "reportes",
        label: "Reportes",
        description: "Estadísticas y productos críticos",
        icon: BarChart3,
        disabled: false,
      },
    ];

    return tabs;
  }, [canManageInventory]);

  if (!canViewInventory) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para ver el inventario. Contacta a un administrador si crees que esto es un error.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">Inventario</p>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
        <p className="text-muted-foreground">
          Administra y monitorea los movimientos, conteos y reportes de stock.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="movimientos" className="mt-0">
          <div className="rounded-xl border bg-card shadow-sm">
            <InventoryMovements />
          </div>
        </TabsContent>

        <TabsContent value="fisico" className="mt-0">
          <div className="rounded-xl border bg-card shadow-sm">
            <InventoryFisico />
          </div>
        </TabsContent>

        <TabsContent value="reportes" className="mt-0">
          <div className="rounded-xl border bg-card shadow-sm">
            <InventoryReportes />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
