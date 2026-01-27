'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CreditCard, Store, ShoppingCart } from 'lucide-react';
import { clientService, Client } from '@/services/client.service';
import type { ClientFull } from '@/types/client.types';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  onEdit: (client: Client) => void;
  onDeleted?: () => void;
}

export function ClientDetailsModal({ isOpen, onClose, clientId, onEdit, onDeleted }: ClientDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ClientFull | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientId) {
      setDetail(null);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await clientService.getClientFull(clientId);
        setDetail(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clientId, isOpen]);

  const handleEdit = async () => {
    if (!clientId) return;
    const fullClient = await clientService.getClientById(clientId);
    onEdit(fullClient);
  };

  const handleDelete = async () => {
    if (!clientId) return;
    const ok = confirm('¿Está seguro de borrar este cliente?');
    if (!ok) return;

    try {
      setDeleting(true);
      await clientService.softDeleteClient(clientId);
      onDeleted?.();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Cliente</DialogTitle>
          <DialogDescription>
            Información general, creador y órdenes asociadas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !detail ? (
          <div className="text-sm text-muted-foreground">No se pudo cargar el detalle.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Nombre</div>
                <div className="text-sm font-medium">{detail.name ?? 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">DNI</div>
                <div className="text-sm font-medium">{detail.dni ?? 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Teléfono</div>
                <div className="text-sm font-medium">{detail.phone ?? 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Correo</div>
                <div className="text-sm font-medium">{detail.email ?? 'N/A'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Dirección</div>
                <div className="text-sm font-medium">{detail.address ?? 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Registrado</div>
                <div className="text-sm font-medium">
                  {detail.createdAt ? format(new Date(detail.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Creado por</div>
                <div className="text-sm font-medium">
                  {detail.createdBy ? `${detail.createdBy.name} (${detail.createdBy.role})` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-muted" />

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b bg-muted/20 -mx-4 px-4 py-2">
                <div className="text-sm font-semibold">Órdenes</div>
              </div>
              {detail.orders?.length ? (
                <div className="space-y-3">
                  {detail.orders.map((order) => (
                    <div key={order.orderNumber} className="rounded-lg border bg-card p-4 space-y-4">
                      {/* Header de la orden */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Número de Orden</div>
                          <div className="text-base font-semibold">{order.orderNumber}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Estado</div>
                          <Badge 
                            variant={order.status === 'COMPLETED' ? 'default' : 
                                    order.status === 'PENDING' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Contenido de la orden */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Items */}
                        <div className="rounded-md border border-muted/50 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm font-medium">Items</div>
                          </div>
                          <div className="space-y-2">
                            {order.items?.length ? (
                              order.items.map((it, idx) => (
                                <div key={`${it.name}-${idx}`} className="flex justify-between items-center gap-2 text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{it.name}</span>
                                    <span className="text-muted-foreground ml-2">x{it.quantity}</span>
                                  </div>
                                  <span className="font-semibold">S/ {it.price}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic">Sin items</div>
                            )}
                          </div>
                        </div>

                        {/* Pagos */}
                        <div className="rounded-md border border-muted/50 bg-muted/20 p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm font-medium">Métodos de Pago</div>
                          </div>
                          <div className="space-y-2">
                            {order.payments?.length ? (
                              order.payments.map((p, idx) => (
                                <div key={`${p.type}-${idx}`} className="flex justify-between items-center gap-2 text-sm">
                                  <span className="capitalize">{p.type.toLowerCase()}</span>
                                  <span className="font-semibold">S/ {p.amount}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic">Sin pagos registrados</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Total y Fecha */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Fecha</div>
                          <div className="text-sm font-medium">
                            {order.date ? format(new Date(order.date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="text-lg font-bold text-primary">S/ {order.total}</div>
                        </div>
                      </div>

                      {/* Información de caja */}
                      {order.cashSession && (
                        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Información de Caja</div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">Tienda</div>
                              <div className="font-medium text-blue-800 dark:text-blue-200">{order.cashSession.store}</div>
                            </div>
                            <div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">Apertura</div>
                              <div className="font-medium text-blue-800 dark:text-blue-200">
                                {order.cashSession.openedAt
                                  ? format(new Date(order.cashSession.openedAt), 'dd/MM HH:mm')
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-blue-600 dark:text-blue-400">Cierre</div>
                              <div className="font-medium text-blue-800 dark:text-blue-200">
                                {order.cashSession.closedAt
                                  ? format(new Date(order.cashSession.closedAt), 'dd/MM HH:mm')
                                  : 'Abierta'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <div className="text-sm text-muted-foreground">Este cliente aún no tiene órdenes registradas.</div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="w-full flex items-center justify-between gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={!clientId || deleting || loading}>
              {deleting ? 'Borrando...' : 'Borrar cliente'}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={handleEdit} disabled={!clientId || loading}>
                Editar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
