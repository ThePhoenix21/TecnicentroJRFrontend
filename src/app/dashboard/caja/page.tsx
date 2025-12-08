'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Power, 
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cashSessionService } from '@/services/cash-session.service';
import { cashService } from '@/services/cash.service';
import { CashSession, CashBalance, CashMovement } from '@/types/cash.types';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/utils';

export default function CajaPage() {
  const { user, currentStore, hasPermission, isAdmin } = useAuth();

  const canViewCash = isAdmin || hasPermission?.("VIEW_CASH") || hasPermission?.("MANAGE_CASH");
  const canManageCash = isAdmin || hasPermission?.("MANAGE_CASH");

  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('50');
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementData, setMovementData] = useState({
    amount: '',
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    description: ''
  });
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeData, setCloseData] = useState({
    email: '',
    password: '',
    declaredAmount: ''
  });
  
  // Estado para paginación de movimientos
  const [currentPage, setCurrentPage] = useState(1);
  const movementsPerPage = 10;
  
  // Funciones de paginación
  const totalPages = balance ? Math.ceil(balance.movements.length / movementsPerPage) : 1;
  
  const getCurrentMovements = () => {
    if (!balance) return [];
    // Ordenar por createdAt descendente (más nuevos primero)
    const sortedMovements = [...balance.movements].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const startIndex = (currentPage - 1) * movementsPerPage;
    const endIndex = startIndex + movementsPerPage;
    return sortedMovements.slice(startIndex, endIndex);
  };
  
  // Resetear página cuando cambian los movimientos
  useEffect(() => {
    if (balance) {
      setCurrentPage(1);
    }
  }, [balance?.movements.length]);

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
      setOpeningAmount('50');
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

    } catch (error: any) {
      console.error('Error al cerrar caja:', error);
      toast.error(error.response?.data?.message || 'Error al cerrar la caja');
    } finally {
      setIsClosing(false);
    }
  };

  const handleAddMovement = async () => {
    if (!currentSession || !movementData.amount || !movementData.description) {
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
        amount: parseFloat(movementData.amount),
        type: movementData.type,
        description: movementData.description
      });
      
      toast.success('Movimiento agregado exitosamente');
      setMovementData({ amount: '', type: 'INCOME', description: '' });
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
          {currentSession?.status === 'OPEN' && canManageCash && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowMovementForm(!showMovementForm)}
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
                  placeholder="50.00"
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
            <div className="grid gap-4 md:grid-cols-3">
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
                onClick={handleAddMovement}
                disabled={isAddingMovement || !movementData.amount || !movementData.description}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingMovement ? 'Agregando...' : 'Agregar Movimiento'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMovementForm(false);
                  setMovementData({ amount: '', type: 'INCOME', description: '' });
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

      {/* Últimos movimientos */}
      {balance?.movements && balance.movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Información de movimientos */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Mostrando {Math.min(movementsPerPage, getCurrentMovements().length)} de {balance.movements.length} movimientos
                </p>
                {balance.movements.length > movementsPerPage && (
                  <p>
                    Página {currentPage} de {totalPages} ({movementsPerPage} por página)
                  </p>
                )}
              </div>
              
              {/* Paginación */}
              {balance.movements.length > movementsPerPage && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm font-medium">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Lista de movimientos */}
              <div className="space-y-2">
                {getCurrentMovements().map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        movement.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {movement.type === 'INCOME' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{formatDescription(movement.description)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleString()}
                          {movement.clientName && ` • ${movement.clientName}`}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      movement.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(movement.amount)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Paginación inferior */}
              {balance.movements.length > movementsPerPage && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
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
    </div>
  );
}
