"use client";

import { InventoryCountSession } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, ClipboardList } from "lucide-react";

interface InventoryCountSessionListProps {
  sessions: InventoryCountSession[];
  isLoading: boolean;
  onSelectSession: (session: InventoryCountSession) => void;
}

export function InventoryCountSessionList({ sessions, isLoading, onSelectSession }: InventoryCountSessionListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-muted/50" />
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold text-muted-foreground">No hay sesiones de inventario</h3>
        <p className="text-sm text-muted-foreground">Comienza una nueva sesión para realizar un conteo físico.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => {
        // Determinar estado basado en finalizedAt
        const isOpen = !session.finalizedAt;
        
        return (
        <Card 
            key={session.id} 
            className="group hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => onSelectSession(session)}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium line-clamp-1">
              {session.name}
            </CardTitle>
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? 'Activa' : 'Cerrada'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Creada:</span>
                <span className="font-medium text-foreground">
                    {format(new Date(session.createdAt), "dd MMM yyyy", { locale: es })}
                </span>
              </div>
              {!isOpen && session.finalizedAt && (
                <div className="flex justify-between">
                  <span>Finalizada:</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(session.finalizedAt), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" className="group-hover:text-primary">
                    Ver detalles <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>
      )})}
    </div>
  );
}
