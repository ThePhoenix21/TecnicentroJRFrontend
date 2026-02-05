import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { orderService, type OrderPaymentMethodsResponse, type PaymentTypeInput } from "@/services/order.service";
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

type CancelOrderItemInfo = {
  name: string;
  quantity?: number;
};

export type CancelOrderInfo = {
  orderId: string;
  orderNumber?: string;
  totalAmount?: number;
  products?: CancelOrderItemInfo[];
  services?: CancelOrderItemInfo[];
};

export interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paymentMethods: Array<{ type: PaymentTypeInput; amount: number }>) => Promise<void>;
  loading: boolean;
  orderInfo?: CancelOrderInfo | null;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  orderInfo,
}: CancelOrderDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [paymentOverview, setPaymentOverview] = useState<OrderPaymentMethodsResponse | null>(null);
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false);
  const [paymentInfoError, setPaymentInfoError] = useState<string | null>(null);

  const createPaymentMethod = (overrides: Partial<CancelPaymentMethod> = {}): CancelPaymentMethod => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "EFECTIVO",
    amount: 0,
    ...overrides,
  });

  const [paymentMethods, setPaymentMethods] = useState<CancelPaymentMethod[]>([
    createPaymentMethod({ id: "pm-1" })
  ]);

  const defaultRefundAmount = paymentOverview?.totalAmount ?? orderInfo?.totalAmount ?? 0;

  const formatCurrency = (value?: number) => {
    const amount = Number(value ?? 0);
    return amount.toLocaleString("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const resetState = () => {
    setError(null);
    setPaymentInfoError(null);
    setPaymentOverview(null);
    setPaymentMethods([
      createPaymentMethod({ id: "pm-1", amount: Number(defaultRefundAmount) || 0 })
    ]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  useEffect(() => {
    if (!open) return;

    setPaymentMethods((prev) => {
      if (prev.length === 1 && prev[0].amount === 0) {
        return [{ ...prev[0], amount: Number(orderInfo?.totalAmount ?? 0) }];
      }
      return prev;
    });
  }, [open, orderInfo?.totalAmount]);

  useEffect(() => {
    if (!open || !orderInfo?.orderId) {
      return;
    }

    const fetchPaymentInfo = async () => {
      setIsLoadingPaymentInfo(true);
      setPaymentInfoError(null);
      try {
        const response = await orderService.getOrderPaymentMethods(orderInfo.orderId);
        setPaymentOverview(response);
        setPaymentMethods((prev) => {
          if (prev.length === 1 && prev[0].amount === 0) {
            return [{ ...prev[0], amount: Number(response.totalAmount ?? 0) }];
          }
          return prev;
        });
      } catch (err) {
        console.error("Error al cargar métodos de pago de la orden", err);
        setPaymentInfoError("No se pudo cargar la información de pagos. Intente nuevamente.");
      } finally {
        setIsLoadingPaymentInfo(false);
      }
    };

    fetchPaymentInfo();
  }, [open, orderInfo?.orderId]);

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

  const hasOrderItems = (orderInfo?.products?.length || 0) > 0 || (orderInfo?.services?.length || 0) > 0;
  const hasServices = (orderInfo?.services?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
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

            {orderInfo && (
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">Orden</p>
                  <p className="font-semibold">
                    {orderInfo.orderNumber || orderInfo.orderId}
                  </p>
                </div>
                {hasOrderItems && (
                  <div className="space-y-2">
                    {orderInfo.products && orderInfo.products.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Productos</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {orderInfo.products.map((product, idx) => (
                            <li key={`${product.name}-${idx}`} className="flex items-center justify-between">
                              <span>{product.name}</span>
                              {product.quantity ? (
                                <span className="text-xs text-muted-foreground">x{product.quantity}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {orderInfo.services && orderInfo.services.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Servicios</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {orderInfo.services.map((service, idx) => (
                            <li key={`${service.name}-${idx}`}>{service.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">Monto total del producto/servicio</p>
                  <p className="font-semibold">{formatCurrency(defaultRefundAmount)}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pagos registrados</p>
                {isLoadingPaymentInfo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {paymentInfoError && (
                <p className="text-sm text-destructive">{paymentInfoError}</p>
              )}
              {!paymentInfoError && (
                <>
                  {paymentOverview?.payments?.length ? (
                    <ul className="space-y-2 text-sm">
                      {paymentOverview.payments.map((payment) => (
                        <li key={payment.id} className="flex items-center justify-between">
                          <span className="font-medium">{payment.type}</span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se registraron pagos para esta orden.</p>
                  )}
                  {paymentOverview && (
                    <div className="pt-2 text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between text-emerald-600">
                        <span className="font-semibold">Total a devolver</span>
                        <span className="font-bold">{formatCurrency(paymentOverview.totalPaid)}</span>
                      </div>
                      {hasServices && (
                        <div className="flex justify-between opacity-80">
                          <span>Saldo pendiente, no recibido</span>
                          <span className="font-semibold">{formatCurrency(paymentOverview.pendingAmount)}</span>
                        </div>
                      )}
                      {paymentOverview.payments.length > 1 && (
                        <p>Esta orden tiene múltiples métodos de pago. Registre la devolución considerando cada método utilizado.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Puedes registrar cómo se devolverá el dinero. Deja los montos en 0 si no habrá devolución.
              </p>
              <div className="space-y-3">
                {paymentMethods.map((pm, index) => (
                  <div key={pm.id} className="relative rounded-lg border p-3">
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-7 text-xs"
                        onClick={() => removePaymentMethod(pm.id)}
                        disabled={loading}
                      >
                        Eliminar
                      </Button>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
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
                          className="w-full mt-1 rounded-md border px-2 py-1 text-sm"
                          value={pm.amount}
                          onChange={(e) => updatePaymentMethod(pm.id, "amount", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
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
