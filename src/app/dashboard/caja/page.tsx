'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Power, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { cashSessionService } from '@/services/cash-session.service';
import { cashService } from '@/services/cash.service';
import { clientService } from '@/services/client.service';
import { CashSession, CashBalance, CashMovement, CashMovementListItem, CashMovementLookupItem } from '@/types/cash.types';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/utils';

export default function CajaPage() {
  const { user, currentStore, hasPermission, isAdmin, canIssuePdf } = useAuth();

  const canViewCash = isAdmin || hasPermission?.("VIEW_CASH") || hasPermission?.("MANAGE_CASH");
  const canManageCash = isAdmin || hasPermission?.("MANAGE_CASH");

  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('0');
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementData, setMovementData] = useState({
    amount: '',
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    payment: 'EFECTIVO',
    description: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMovementModalOpen, setIsMobileMovementModalOpen] = useState(false);
  const [mobileMovementStep, setMobileMovementStep] = useState<'select' | 'form'>('select');
  const [mobileMovementType, setMobileMovementType] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [mobileMovementPayment, setMobileMovementPayment] = useState('EFECTIVO');
  const [mobileMovementAmount, setMobileMovementAmount] = useState('');
  const [mobileMovementDescription, setMobileMovementDescription] = useState('');
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeData, setCloseData] = useState({
    email: '',
    password: '',
    declaredAmount: ''
  });
  
  // Estado para impresión de cierre histórico
  const [showPrintHistoricalDialog, setShowPrintHistoricalDialog] = useState(false);
  const [historicalCashId, setHistoricalCashId] = useState('');
  const [isPrintingHistorical, setIsPrintingHistorical] = useState(false);

  // =====================
  // Movimientos (nuevo listado paginado con filtros)
  // =====================
  const [movements, setMovements] = useState<CashMovementListItem[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotalPages, setMovementsTotalPages] = useState(1);
  const [movementsTotal, setMovementsTotal] = useState(0);

  const [paymentLookup, setPaymentLookup] = useState<CashMovementLookupItem[]>([]);
  const [operationLookup, setOperationLookup] = useState<CashMovementLookupItem[]>([]);
  const [clientLookup, setClientLookup] = useState<Array<{ id: string; name: string }>>([]);

  const [paymentFilter, setPaymentFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const filtersActive = useMemo(() => {
    return !!(paymentFilter.trim() || operationFilter.trim() || clientQuery.trim());
  }, [paymentFilter, operationFilter, clientQuery]);

  const movementsPageSize = filtersActive ? 20 : 50;

  const loadMovements = useCallback(async (targetPage: number) => {
    if (!currentSession?.id) return;
    if (!canViewCash) return;

    setMovementsLoading(true);
    try {
      const response = await cashService.getCashMovementsList({
        sessionId: currentSession.id,
        page: targetPage,
        pageSize: movementsPageSize,
        payment: paymentFilter.trim() || undefined,
        operation: operationFilter.trim() || undefined,
        clientName: clientQuery.trim() || undefined,
      });

      setMovements(Array.isArray(response.data) ? response.data : []);
      setMovementsTotal(response.total || 0);
      setMovementsTotalPages(response.totalPages || 1);
      setMovementsPage(response.page || targetPage);
    } catch (error) {
      console.error('Error al cargar movimientos (listado):', error);
      setMovements([]);
      setMovementsTotal(0);
      setMovementsTotalPages(1);
      toast.error('Error al cargar movimientos de caja');
    } finally {
      setMovementsLoading(false);
    }
  }, [currentSession?.id, currentSession?.id, canViewCash, movementsPageSize, paymentFilter, operationFilter, clientQuery]);

  const loadMovementsRef = useRef(loadMovements);

  useEffect(() => {
    loadMovementsRef.current = loadMovements;
  }, [loadMovements]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [payments, operations, clients] = await Promise.all([
          cashService.getCashMovementsLookupPayment(),
          cashService.getCashMovementsLookupOperation(),
          clientService.getLookupName(),
        ]);
        setPaymentLookup(Array.isArray(payments) ? payments : []);
        setOperationLookup(Array.isArray(operations) ? operations : []);
        setClientLookup(Array.isArray(clients) ? clients : []);
      } catch (error) {
        console.error('Error loading cash movement lookups:', error);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    if (!currentSession?.id) return;
    setMovementsPage(1);
    loadMovementsRef.current?.(1);
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession?.id) return;
    const timer = setTimeout(() => {
      setMovementsPage(1);
      loadMovementsRef.current?.(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [paymentFilter, operationFilter, clientQuery, currentSession?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const apply = () => {
      const nextIsMobile = mediaQuery.matches;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        // Abortamos cualquier flujo móvil en progreso para evitar errores al cambiar a pantalla grande.
        setIsMobileMovementModalOpen(false);
        setMobileMovementStep('select');
        setMobileMovementType(null);
        setMobileMovementPayment('EFECTIVO');
        setMobileMovementAmount('');
        setMobileMovementDescription('');
      }
    };

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => {
      mediaQuery.removeEventListener('change', apply);
    };
  }, []);

  const loadCurrentSession = useCallback(async () => {
    if (!currentStore) return;
    
    try {
      setLoading(true);
      const session = await cashSessionService.getCurrentSessionByStore(currentStore.id);
      setCurrentSession(session);
      
      if (session && session.status === 'OPEN') {
        // Nota: Necesitaremos actualizar esto para usar el servicio de cash movements
        const balanceData = await cashService.getCashBalance(session.id);
        console.log('📊 Balance data recibido:', balanceData);
        setBalance(balanceData);
      } else {
        console.log('❌ No hay sesión abierta, balance seteado a null');
        setBalance(null);
      }
    } catch (error) {
      console.error('Error al cargar sesión actual:', error);
      toast.error('Error al cargar la sesión de caja');
    } finally {
      setLoading(false);
    }
  }, [currentStore]);

  useEffect(() => {
    loadCurrentSession();
  }, [loadCurrentSession]);

  const handleOpenCashSession = async () => {
    if (!canManageCash) {
      toast.error('No tienes permisos para abrir la caja (MANAGE_CASH requerido)');
      return;
    }
    if (!currentStore || !openingAmount) {
      toast.error('Por favor ingrese un monto de apertura');
      return;
    }

    try {
      setIsOpening(true);
      await cashSessionService.createCashSession({
        storeId: currentStore.id,
        openingAmount: parseFloat(openingAmount)
      });
      
      toast.success('Caja abierta exitosamente');
      await loadCurrentSession();
      setOpeningAmount('0');
    } catch (error: any) {
      console.error('Error al abrir caja:', error);
      toast.error(error.response?.data?.message || 'Error al abrir la caja');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCloseCashSession = async () => {
    if (!currentSession) return;

    if (!canManageCash) {
      toast.error('No tienes permisos para cerrar la caja (MANAGE_CASH requerido)');
      return;
    }

    try {
      setIsClosing(true);
      const response = await cashSessionService.closeCashSession(currentSession.id, {
        email: closeData.email,
        password: closeData.password,
        declaredAmount: parseFloat(closeData.declaredAmount || '0')
      });
      
      toast.success('Caja cerrada exitosamente');
      setShowCloseForm(false);
      setCloseData({ email: '', password: '', declaredAmount: '' });
      await loadCurrentSession();

      if (canIssuePdf) {
        // Generar e imprimir reporte PDF automáticamente
        try {
          const { default: ReceiptClosingPDF } = await import('./ReceiptClosingPDF');
          const { pdf } = await import('@react-pdf/renderer');

          // Intentar obtener todos los movimientos de la sesión para que el PDF
          // incluya también ingresos manuales (como pagos diferidos de servicios)
          let closingData = response as any;
          try {
            const movementsResponse = await cashService.getCashMovements(currentSession.id, 1, 1000);
            closingData = {
              ...response,
              movements: movementsResponse.data,
            };
          } catch (movErr) {
            console.error('Error al obtener movimientos para el PDF de cierre:', movErr);
          }

          const blob = await pdf(
            <ReceiptClosingPDF data={closingData} />
          ).toBlob();
          
          const pdfUrl = URL.createObjectURL(blob);
          const printWindow = window.open(pdfUrl, '_blank');
          
          if (printWindow) {
            // Esperar a que cargue el PDF antes de imprimir
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          }
        } catch (pdfError) {
          console.error('Error al generar reporte PDF:', pdfError);
          toast.error('Caja cerrada, pero no se pudo generar el reporte PDF automático');
        }
      }

    } catch (error: any) {
      console.error('Error al cerrar caja:', error);
      toast.error(error.response?.data?.message || 'Error al cerrar la caja');
    } finally {
      setIsClosing(false);
    }
  };

  const handleAddMovement = async (payload?: { type: 'INCOME' | 'EXPENSE'; payment: string; amount: string; description: string; }) => {
    const data = payload ?? movementData;

    if (!currentSession || !data.amount || !data.description || !data.payment) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    if (!canManageCash) {
      toast.error('No tienes permisos para agregar movimientos manuales (MANAGE_CASH requerido)');
      return;
    }

    try {
      setIsAddingMovement(true);
      await cashService.addManualMovement({
        cashSessionId: currentSession.id,
        amount: parseFloat(data.amount),
        type: data.type,
        payment: data.payment,
        description: data.description
      });
      
      toast.success('Movimiento agregado exitosamente');
      setMovementData({ amount: '', type: 'INCOME', payment: 'EFECTIVO', description: '' });
      setShowMovementForm(false);
      await loadCurrentSession();
    } catch (error: any) {
      console.error('Error al agregar movimiento:', error);
      toast.error(error.response?.data?.message || 'Error al agregar el movimiento');
    } finally {
      setIsAddingMovement(false);
    }
  };

  const formatDescription = (description: string) => {
    // Eliminar el UUID del final si existe (formato: " - Orden UUID")
    return description.replace(/ - Orden [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i, '');
  };

  const handlePrintHistoricalClose = async () => {
    if (!historicalCashId.trim()) {
      toast.error('Por favor ingrese el ID de la caja cerrada');
      return;
    }

    if (!canIssuePdf) {
      toast.error('No tienes permisos para imprimir PDFs');
      return;
    }

    try {
      setIsPrintingHistorical(true);
      
      // Obtener datos del cierre histórico
      const closingData = await cashService.getCashCloseReceipt(historicalCashId.trim());
      
      // Generar e imprimir PDF con el componente adaptador
      const { default: HistoricalClosingPDF } = await import('./HistoricalClosingPDF');
      const { pdf } = await import('@react-pdf/renderer');

      const blob = await pdf(
        <HistoricalClosingPDF data={closingData} />
      ).toBlob();
      
      const pdfUrl = URL.createObjectURL(blob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        // Esperar a que cargue el PDF antes de imprimir
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }

      // Cerrar diálogo y limpiar
      setShowPrintHistoricalDialog(false);
      setHistoricalCashId('');
      toast.success('Receipt de cierre histórico generado exitosamente');
      
    } catch (error: any) {
      console.error('Error al generar receipt de cierre histórico:', error);
      toast.error(error.response?.data?.message || 'Error al generar el receipt de cierre histórico');
    } finally {
      setIsPrintingHistorical(false);
    }
  };

  if (loading) {
    if (!canViewCash) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Gestión de Caja</h1>
        <p className="text-muted-foreground">
          No tienes permisos para ver esta sección.
        </p>
      </div>
    );
  }

  return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestión de Caja</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Caja</h1>
          <p className="text-muted-foreground">
            {currentStore?.name} - {user?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {canIssuePdf && (
            <Button
              variant="outline"
              onClick={() => setShowPrintHistoricalDialog(true)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Cierre
            </Button>
          )}
          {currentSession?.status === 'OPEN' && canManageCash && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (isMobile) {
                    setIsMobileMovementModalOpen(true);
                    setMobileMovementStep('select');
                    setMobileMovementType(null);
                    setMobileMovementPayment('EFECTIVO');
                    setMobileMovementAmount('');
                    setMobileMovementDescription('');
                    return;
                  }
                  setShowMovementForm(!showMovementForm);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Movimiento
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowCloseForm(true)}
                disabled={isClosing}
              >
                <Power className="h-4 w-4 mr-2" />
                Cerrar Caja
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estado de Caja */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Caja</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {currentSession ? (
                  <Badge variant={currentSession.status === 'OPEN' ? 'default' : 'secondary'}>
                    {currentSession.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                  </Badge>
                ) : (
                  <Badge variant="outline">Sin abrir</Badge>
                )}
              </div>
              {currentSession?.status === 'OPEN' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSession ? `Abierta: ${new Date(currentSession.openedAt).toLocaleString()}` : 'No hay sesión activa'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Inicial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentSession?.openingAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Fondo inicial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(balance?.balance?.totalIngresos || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance?.movements?.length || 0} movimientos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(balance?.balance?.totalSalidas || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Salidas de caja</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Actual */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cuadre de Caja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Balance Actual</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(balance.balance.balanceActual || 0)}
                </p>                
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(balance.balance.totalIngresos || 0)}
                </p>                
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Egresos</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(balance.balance.totalSalidas || 0)}
                </p>                
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Inicial</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balance.balance.openingAmount || 0)}
                </p>                
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isMobile && isMobileMovementModalOpen}
        onOpenChange={(open) => {
          if (!isMobile) return;
          setIsMobileMovementModalOpen(open);
          if (!open) {
            setMobileMovementStep('select');
            setMobileMovementType(null);
            setMobileMovementPayment('EFECTIVO');
            setMobileMovementAmount('');
            setMobileMovementDescription('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Movimiento de caja</DialogTitle>
          </DialogHeader>

          {mobileMovementStep === 'select' ? (
            <div className="grid gap-3">
              <Button
                type="button"
                className="h-14 text-base justify-start"
                onClick={() => {
                  setMobileMovementType('INCOME');
                  setMobileMovementStep('form');
                }}
              >
                <TrendingUp className="h-5 w-5 mr-3" />
                Ingreso
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-14 text-base justify-start"
                onClick={() => {
                  setMobileMovementType('EXPENSE');
                  setMobileMovementStep('form');
                }}
              >
                <TrendingDown className="h-5 w-5 mr-3" />
                Egreso
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de pago</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={mobileMovementPayment}
                  onChange={(e) => setMobileMovementPayment(e.target.value)}
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TARJETA">TARJETA</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="YAPE">YAPE</option>
                  <option value="PLIN">PLIN</option>
                  <option value="DATAPHONE">DATAPHONE</option>
                  <option value="BIZUM">BIZUM</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Monto</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={mobileMovementAmount}
                  onChange={(e) => setMobileMovementAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <textarea
                  className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ej: compra de insumos, ingreso extra, etc."
                  value={mobileMovementDescription}
                  onChange={(e) => setMobileMovementDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMobileMovementStep('select');
                    setMobileMovementType(null);
                    setMobileMovementPayment('EFECTIVO');
                    setMobileMovementAmount('');
                    setMobileMovementDescription('');
                  }}
                  disabled={isAddingMovement}
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!mobileMovementType) return;
                    await handleAddMovement({
                      type: mobileMovementType,
                      payment: mobileMovementPayment,
                      amount: mobileMovementAmount,
                      description: mobileMovementDescription,
                    });

                    // Si se agregó bien, cerramos y reseteamos
                    setIsMobileMovementModalOpen(false);
                    setMobileMovementStep('select');
                    setMobileMovementType(null);
                    setMobileMovementPayment('EFECTIVO');
                    setMobileMovementAmount('');
                    setMobileMovementDescription('');
                  }}
                  disabled={
                    isAddingMovement ||
                    !mobileMovementType ||
                    !mobileMovementPayment ||
                    !mobileMovementAmount ||
                    !mobileMovementDescription
                  }
                >
                  {isAddingMovement ? 'Procesando...' : 'Aceptar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulario para abrir caja */}
      {!currentSession && canManageCash && (
        <Card>
          <CardHeader>
            <CardTitle>Abrir Caja</CardTitle>
            <p className="text-sm text-muted-foreground">
              Inicia una nueva sesión de caja para comenzar a registrar operaciones
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Monto Inicial</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <Button
                onClick={handleOpenCashSession}
                disabled={isOpening || !openingAmount}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {isOpening ? 'Abriendo...' : 'Abrir Caja'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de movimiento manual */}
      {showMovementForm && currentSession && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar Movimiento Manual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registra ingresos o egresos manuales en la caja
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={movementData.type}
                  onChange={(e) => setMovementData({...movementData, type: e.target.value as 'INCOME' | 'EXPENSE'})}
                >
                  <option value="INCOME">Ingreso</option>
                  <option value="EXPENSE">Egreso</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Método de pago</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={movementData.payment}
                  onChange={(e) => setMovementData({ ...movementData, payment: e.target.value })}
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TARJETA">TARJETA</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="YAPE">YAPE</option>
                  <option value="PLIN">PLIN</option>
                  <option value="DATAPHONE">DATAPHONE</option>
                  <option value="BIZUM">BIZUM</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Monto</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={movementData.amount}
                  onChange={(e) => setMovementData({...movementData, amount: e.target.value})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  placeholder="Ej: Venta de productos varios"
                  value={movementData.description}
                  onChange={(e) => setMovementData({...movementData, description: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAddMovement()}
                disabled={isAddingMovement || !movementData.amount || !movementData.description || !movementData.payment}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingMovement ? 'Agregando...' : 'Agregar Movimiento'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMovementForm(false);
                  setMovementData({ amount: '', type: 'INCOME', payment: 'EFECTIVO', description: '' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de cierre de caja */}
      {showCloseForm && currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Power className="h-5 w-5" />
              Cerrar Caja
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Para cerrar la caja, verifica tu identidad con tus credenciales
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={closeData.email}
                  onChange={(e) => setCloseData({...closeData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={closeData.password}
                  onChange={(e) => setCloseData({...closeData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monto Declarado (Físico)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={closeData.declaredAmount}
                  onChange={(e) => setCloseData({...closeData, declaredAmount: e.target.value})}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleCloseCashSession}
                disabled={isClosing || !closeData.email || !closeData.password || !closeData.declaredAmount}
              >
                <Power className="h-4 w-4 mr-2" />
                {isClosing ? 'Cerrando...' : 'Confirmar Cierre'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCloseForm(false);
                  setCloseData({ email: '', password: '', declaredAmount: '' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movimientos de Caja (nuevo listado) */}
      {currentSession?.id && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de pago</label>
                  <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v === '__ALL__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todos</SelectItem>
                      {paymentLookup.map((item) => (
                        <SelectItem key={item.id} value={item.value}>
                          {item.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Operación</label>
                  <Select value={operationFilter} onValueChange={(v) => setOperationFilter(v === '__ALL__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todas</SelectItem>
                      {operationLookup.map((item) => (
                        <SelectItem key={item.id} value={item.value}>
                          {item.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <div className="relative">
                    <Input
                      value={clientQuery}
                      onChange={(e) => {
                        setClientQuery(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setShowClientSuggestions(false)}
                      placeholder="Buscar cliente..."
                    />
                    {clientQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientQuery('');
                          setShowClientSuggestions(false);
                        }}
                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    )}

                    {showClientSuggestions && clientLookup.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                        <div className="max-h-64 overflow-auto">
                          {clientLookup
                            .filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
                            .slice(0, 20)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setClientQuery(c.name);
                                  setShowClientSuggestions(false);
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                              >
                                <span>{c.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Mostrando {movements.length} de {movementsTotal} movimientos
                  {filtersActive && ` (filtrados)`}
                </p>
                <p>
                  Página {movementsPage} de {movementsTotalPages}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = movementsPage - 1;
                    if (next < 1) return;
                    setMovementsPage(next);
                    loadMovementsRef.current?.(next);
                  }}
                  disabled={movementsLoading || movementsPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = movementsPage + 1;
                    if (next > movementsTotalPages) return;
                    setMovementsPage(next);
                    loadMovementsRef.current?.(next);
                  }}
                  disabled={movementsLoading || movementsPage >= movementsTotalPages}
                >
                  Siguiente
                </Button>
              </div>

              {movementsLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Cargando movimientos...</div>
              ) : movements.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No hay movimientos para los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${movement.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {movement.type === 'INCOME' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{formatDescription(movement.description)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleString()} • {movement.payment}
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(Number(movement.amount) || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas informativas */}
      {!currentSession && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay una sesión de caja abierta. Debes abrir la caja para comenzar a registrar operaciones.
          </AlertDescription>
        </Alert>
      )}

      {/* Diálogo para imprimir cierre histórico */}
      <Dialog open={showPrintHistoricalDialog} onOpenChange={setShowPrintHistoricalDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Imprimir Cierre de Caja Histórico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ID de Caja Cerrada</label>
              <Input
                placeholder="Ingrese el ID de la caja cerrada"
                value={historicalCashId}
                onChange={(e) => setHistoricalCashId(e.target.value)}
                disabled={isPrintingHistorical}
              />
              <p className="text-xs text-muted-foreground">
                Ingrese el ID de la sesión de caja cerrada que desea imprimir
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPrintHistoricalDialog(false);
                  setHistoricalCashId('');
                }}
                disabled={isPrintingHistorical}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePrintHistoricalClose}
                disabled={isPrintingHistorical || !historicalCashId.trim()}
                className="flex-1"
              >
                {isPrintingHistorical ? 'Imprimiendo...' : 'Imprimir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
