"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { inventoryService } from "@/services/inventory.service";
import { usePermissions, PERMISSIONS } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus } from "lucide-react";

interface CreateSessionDialogProps {
  onSessionCreated: () => void;
}

export function CreateSessionDialog({ onSessionCreated }: CreateSessionDialogProps) {
  const { currentStore, user, isAdmin } = useAuth();
  const { can } = usePermissions();
  const canStartPhysicalInventory = isAdmin || can(PERMISSIONS.START_PHYSICAL_INVENTORY);
  
  // Log para depurar permisos
  console.log("CreateSessionDialog - User Role:", user?.role, "IsAdmin:", isAdmin);

  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) return;
    
    // Generar nombre por defecto si está vacío
    const sessionName = name.trim() || `Inventario ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} - ${currentStore.name}`;

    setIsLoading(true);
    try {
      console.log("Intentando crear sesión:", { name: sessionName, storeId: currentStore.id });
      await inventoryService.createCountSession({
        name: sessionName,
        storeId: currentStore.id
      });
      console.log("Sesión creada exitosamente");

      toast({
        title: "Sesión creada",
        description: "La sesión de inventario ha sido creada exitosamente.",
      });
      
      setOpen(false);
      setName("");
      onSessionCreated();
    } catch (error) {
      console.error("Error al crear sesión:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la sesión.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Solo puede crear/gestionar sesiones quien tenga START_PHYSICAL_INVENTORY (o admin)
  if (!canStartPhysicalInventory) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sesión
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar Inventario Físico</DialogTitle>
          <DialogDescription>
            Crea una nueva sesión de conteo para registrar el stock físico de la tienda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la Sesión</Label>
              <Input
                id="name"
                placeholder={`Ej: Inventario ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Sesión
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
