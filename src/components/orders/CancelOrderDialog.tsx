import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";

export interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: CancelOrderDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    // Clear error when dialog is closed
    if (!open) {
      setError(null);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError("Error al anular la orden. Intente nuevamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar anulación de orden
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea anular esta orden? Esta acción no se puede deshacer y 
              restaurará el stock de los productos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {error && (
              <div className="text-red-500 text-sm mt-2 text-center">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Anular orden"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
