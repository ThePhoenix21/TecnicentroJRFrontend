'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';

import { supportTicketService } from '@/services/support-ticket.service';
import type {
  CreateSupportTicketDto,
  SupportTicketDetail,
  SupportTicketListItem,
  TicketPriority,
  TicketStatus,
} from '@/types/support-ticket.types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  REFUSED: 'Rechazado',
  CANCELLED: 'Cancelado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
};

const priorityLabel: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
};

const getStatusClasses = (status: TicketStatus) => {
  if (status === 'OPEN' || status === 'IN_PROGRESS' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'REFUSED' || status === 'CANCELLED') return 'bg-slate-100 text-slate-800';
  return 'bg-rose-100 text-rose-800';
};

const getPriorityClasses = (priority: TicketPriority) => {
  if (priority === 'HIGH') return 'bg-amber-100 text-amber-800';
  if (priority === 'LOW') return 'bg-slate-100 text-slate-800';
  return 'bg-blue-100 text-blue-800';
};

export default function SupportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSupportTicketDto>({
    subject: '',
    message: '',
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);

  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supportTicketService.getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        router.push('/login');
        return;
      }
      if (status === 403) {
        toast.error('Acceso no permitido');
        setTickets([]);
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || 'No se pudieron cargar los tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return tickets;

    return tickets.filter((t) => {
      return (
        normalize(t.subject).includes(q) ||
        normalize(t.status).includes(q) ||
        normalize(t.priority).includes(q)
      );
    });
  }, [tickets, searchTerm]);

  const openCreate = () => {
    setIsCreateOpen(true);
    setCreateSubmitting(false);
    setCreateForm({ subject: '', message: '' });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateSubmitting(false);
  };

  const submitCreate = async () => {
    const dto: CreateSupportTicketDto = {
      subject: createForm.subject?.trim(),
      message: createForm.message?.trim(),
    };

    if (!dto.subject || !dto.message) {
      toast.error('Complete asunto y mensaje');
      return;
    }

    try {
      setCreateSubmitting(true);
      await supportTicketService.createTicket(dto);
      toast.success('Ticket enviado correctamente');
      closeCreate();
      await loadTickets();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        router.push('/login');
        return;
      }
      if (status === 403) {
        toast.error('Acceso no permitido');
        return;
      }
      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }
      if (status === 400) {
        toast.error('Datos inválidos. Revise los campos e intente nuevamente.');
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || 'No se pudo enviar el ticket');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedTicketId(null);
    setDetail(null);
    setDetailLoading(false);
    setCancelSubmitting(false);
  };

  const openDetail = async (ticketId: string) => {
    setIsDetailOpen(true);
    setSelectedTicketId(ticketId);
    setDetail(null);
    setCancelSubmitting(false);

    try {
      setDetailLoading(true);
      const d = await supportTicketService.getTicketById(ticketId);
      setDetail(d);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        router.push('/login');
        return;
      }
      if (status === 403 || status === 404) {
        toast.error('No tienes acceso a este ticket');
        setDetail(null);
        return;
      }
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo cargar el ticket');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!selectedTicketId || !detail) return;
    if (detail.status !== 'OPEN') return;

    const ok = confirm('¿Deseas cancelar este ticket?');
    if (!ok) return;

    try {
      setCancelSubmitting(true);
      await supportTicketService.cancelTicket(selectedTicketId);
      toast.success('Ticket cancelado correctamente');
      setTickets((prev) => prev.map((t) => (t.id === selectedTicketId ? { ...t, status: 'CANCELLED' } : t)));
      setDetail((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
      closeDetail();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        router.push('/login');
        return;
      }
      if (status === 403) {
        toast.error('Acceso no permitido');
        return;
      }
      if (status === 404) {
        toast.error('No tienes acceso a este ticket');
        return;
      }
      if (status === 409) {
        toast.error('No se puede cancelar: el ticket ya fue cerrado o cancelado.');
        return;
      }
      if (status === 429) {
        toast.error('Demasiadas solicitudes. Inténtelo de nuevo en unos segundos.');
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || 'No se pudo cancelar el ticket');
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Soporte Técnico</CardTitle>
                <p className="text-sm text-muted-foreground">Lista de tickets creados por tu usuario</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={openCreate}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Ticket
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por asunto, estado o prioridad..."
                    className="pl-9 pr-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <LifeBuoy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron tickets' : 'No tienes tickets registrados'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => openDetail(t.id)}>
                      <TableCell className="font-medium">{t.subject}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(t.status)}`}>
                          {statusLabel[t.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityClasses(t.priority)}`}>
                          {priorityLabel[t.priority]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreate())}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Nuevo Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto</label>
              <Input
                value={createForm.subject}
                onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))}
                disabled={createSubmitting}
                placeholder="Asunto del ticket"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje</label>
              <textarea
                value={createForm.message}
                onChange={(e) => setCreateForm((p) => ({ ...p, message: e.target.value }))}
                disabled={createSubmitting}
                placeholder="Describe el problema..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreate} disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitCreate} disabled={createSubmitting}>
              {createSubmitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? setIsDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2">
              <DialogHeader>
                <DialogTitle>Detalle del ticket</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !detail ? (
                <div className="text-center py-6 text-muted-foreground">Sin información</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Asunto</h3>
                    <p className="text-sm">{detail.subject}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">Estado</h3>
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusClasses(detail.status)}`}>
                        {statusLabel[detail.status]}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">Prioridad</h3>
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getPriorityClasses(detail.priority)}`}>
                        {priorityLabel[detail.priority]}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Fecha de creación</h3>
                    <p className="text-sm text-muted-foreground">
                      {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Mensaje</h3>
                    <p className="text-sm whitespace-pre-wrap">{detail.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDetail}>
                Cerrar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancelTicket}
                disabled={cancelSubmitting || detailLoading || !detail || detail.status !== 'OPEN'}
              >
                {cancelSubmitting ? 'Cancelando...' : 'Cancelar Ticket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
