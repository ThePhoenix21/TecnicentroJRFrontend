import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PaymentTypeInput } from "@/services/order.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";

type CancelPaymentMethod = {
  id: string;
  type: PaymentTypeInput;
  amount: number;
};

export interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paymentMethods: Array<{ type: PaymentTypeInput; amount: number }>) => Promise<void>;
  loading: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: CancelOrderDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const createPaymentMethod = (overrides: Partial<CancelPaymentMethod> = {}): CancelPaymentMethod => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "EFECTIVO",
    amount: 0,
    ...overrides,
  });

  const [paymentMethods, setPaymentMethods] = useState<CancelPaymentMethod[]>([
    createPaymentMethod({ id: "pm-1" })
  ]);

  const resetState = () => {
    setError(null);
    setPaymentMethods([createPaymentMethod({ id: "pm-1" })]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validMethods = paymentMethods
        .map((pm) => ({ type: pm.type, amount: Number(pm.amount) || 0 }))
        .filter((pm) => pm.amount > 0);

      await onConfirm(validMethods);
      onOpenChange(false);
    } catch (err) {
      setError("Error al anular la orden. Intente nuevamente.");
    }
  };

  const updatePaymentMethod = (id: string, field: "type" | "amount", value: PaymentTypeInput | number) => {
    setPaymentMethods((prev) =>
      prev.map((pm) => (pm.id === id ? { ...pm, [field]: value } : pm))
    );
  };

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => [
      ...prev,
      createPaymentMethod(),
    ]);
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => (prev.length <= 1 ? prev : prev.filter((pm) => pm.id !== id)));
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
          <div className="py-4 space-y-4">
            {error && (
              <div className="text-red-500 text-sm mt-2 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Puedes registrar cómo se devolverá el dinero. Deja los montos en 0 si no habrá devolución.
              </p>
              <div className="space-y-2">
                {paymentMethods.map((pm, index) => (
                  <div key={pm.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Método</label>
                      <select
                        className="w-full mt-1 rounded-md border px-2 py-1 text-sm"
                        value={pm.type}
                        onChange={(e) => updatePaymentMethod(pm.id, "type", e.target.value as PaymentTypeInput)}
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="YAPE">Yape</option>
                        <option value="PLIN">Plin</option>
                        <option value="DATAPHONE">Datáfono</option>
                        <option value="BIZUM">Bizum</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Monto</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28 mt-1 rounded-md border px-2 py-1 text-sm"
                        value={pm.amount}
                        onChange={(e) => updatePaymentMethod(pm.id, "amount", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-center"
                        onClick={() => removePaymentMethod(pm.id)}
                        disabled={loading}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentMethod}
                disabled={loading}
              >
                Agregar método
              </Button>
            </div>
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
