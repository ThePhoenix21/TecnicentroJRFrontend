"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, MoveHorizontal, ClipboardCheck, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function InventoryDashboard() {
  const { hasPermission } = useAuth();

  const canViewInventory = hasPermission("VIEW_INVENTORY") || hasPermission("inventory.read");
  const canManageInventory = hasPermission("MANAGE_INVENTORY") || hasPermission("inventory.manage");

  // Si no puede ni siquiera ver el inventario, mostrar mensaje de acceso restringido
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

  const modules = [
    // Movimientos: visible para cualquiera que pueda ver inventario (solo lectura si no tiene MANAGE_INVENTORY)
    {
      title: "Movimientos",
      description: "Ver historial de entradas, salidas y ajustes de stock.",
      icon: MoveHorizontal,
      href: "/dashboard/inventario/movimientos",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    // Inventario Físico: solo visible si puede gestionar inventario
    ...(canManageInventory
      ? [
          {
            title: "Inventario Físico",
            description: "Realizar conteo mensual y ajustes.",
            icon: ClipboardCheck,
            href: "/dashboard/inventario/conteo-fisico",
            color: "text-green-500",
            bgColor: "bg-green-500/10",
          },
        ]
      : []),
    // Reportes: visible con solo VIEW_INVENTORY
    {
      title: "Reportes",
      description: "Visualizar estadísticas y productos críticos.",
      icon: BarChart3,
      href: "/dashboard/inventario/reportes",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
        <p className="text-muted-foreground">Administra el stock, movimientos y auditorías de tu tienda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-2 hover:border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${module.bgColor}`}>
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
