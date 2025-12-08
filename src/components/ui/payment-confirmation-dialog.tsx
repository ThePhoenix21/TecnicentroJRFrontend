"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PaymentConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  expectedTotal: number;
  paymentTotal: number;
}

export function PaymentConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  expectedTotal,
  paymentTotal,
}: PaymentConfirmationDialogProps) {
  const difference = Math.abs(paymentTotal - expectedTotal);
  const isHigher = paymentTotal > expectedTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Confirmar Monto de Pago
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            El monto total de los métodos de pago es diferente del precio del ítem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">{itemName}</p>
                <div className="text-sm space-y-1">
                  <div>Precio esperado: S/{expectedTotal.toFixed(2)}</div>
                  <div>
                    Total métodos de pago: S/{paymentTotal.toFixed(2)}
                  </div>
                  <div className="font-semibold">
                    Diferencia: S/{difference.toFixed(2)} (
                    {isHigher ? "mayor" : "menor"})
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            ¿Desea continuar con el monto de los métodos de pago? Este monto
            reemplazará el precio original del ítem.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
