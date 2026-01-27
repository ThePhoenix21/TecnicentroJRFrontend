'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
          <DialogTitle>Detalle del Cliente</DialogTitle>
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

            <div className="space-y-3">
              <div className="text-sm font-semibold">Órdenes</div>
              {detail.orders?.length ? (
                <div className="space-y-4">
                  {detail.orders.map((order) => (
                    <div key={order.orderNumber} className="rounded-md border p-3 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Orden</div>
                          <div className="text-sm font-medium">{order.orderNumber}</div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Estado</div>
                            <div className="text-sm font-medium">{order.status}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-sm font-medium">S/ {order.total}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Fecha</div>
                            <div className="text-sm font-medium">
                              {order.date ? format(new Date(order.date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md bg-muted/30 p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Items</div>
                          <div className="space-y-1">
                            {order.items?.length ? (
                              order.items.map((it, idx) => (
                                <div key={`${it.name}-${idx}`} className="text-sm flex justify-between gap-2">
                                  <span>{it.name} x{it.quantity}</span>
                                  <span>S/ {it.price}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">Sin items</div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-md bg-muted/30 p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Pagos</div>
                          <div className="space-y-1">
                            {order.payments?.length ? (
                              order.payments.map((p, idx) => (
                                <div key={`${p.type}-${idx}`} className="text-sm flex justify-between gap-2">
                                  <span>{p.type}</span>
                                  <span>S/ {p.amount}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">Sin pagos</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {order.cashSession && (
                        <div className="rounded-md bg-muted/20 p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Caja</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground">Tienda</div>
                              <div className="font-medium">{order.cashSession.store}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Apertura</div>
                              <div className="font-medium">
                                {order.cashSession.openedAt
                                  ? format(new Date(order.cashSession.openedAt), 'dd/MM/yyyy HH:mm')
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Cierre</div>
                              <div className="font-medium">
                                {order.cashSession.closedAt
                                  ? format(new Date(order.cashSession.closedAt), 'dd/MM/yyyy HH:mm')
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Este cliente aún no tiene órdenes.</div>
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
