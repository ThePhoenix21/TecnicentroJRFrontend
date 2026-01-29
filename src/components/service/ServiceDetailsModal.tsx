'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceStatus, ServiceType, ServiceDetail, serviceService } from '@/services/service.service';
import { useEffect, useRef, useState } from 'react';
import { orderService } from '@/services/order.service';
import { cashService } from '@/services/cash.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ImageOff, ZoomIn, Plus, Minus, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceDetailsModalProps {
  serviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

// Enum para métodos de pago
enum PaymentType {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  DATAPHONE = 'DATAPHONE',
  BIZUM = 'BIZUM',
  OTRO = 'OTRO'
}

type PaymentTypeValue = (typeof PaymentType)[keyof typeof PaymentType];

// Tipo para método de pago individual
type PaymentMethod = {
  id: string;
  type: PaymentTypeValue;
  amount: number;
};

const statusOptions = [
  { value: ServiceStatus.IN_PROGRESS, label: 'En Progreso' },
  { value: ServiceStatus.COMPLETED, label: 'Completado' },
  { value: ServiceStatus.DELIVERED, label: 'Entregado' },
  { value: ServiceStatus.PAID, label: 'Pagado' },
  { value: ServiceStatus.ANNULLATED, label: 'Anulado' },
];

// Función para obtener variante de badge según estado
const getStatusVariant = (status?: ServiceStatus) => {
  switch (status) {
    case ServiceStatus.PENDING:
      return 'secondary';
    case ServiceStatus.IN_PROGRESS:
      return 'default';
    case ServiceStatus.COMPLETED:
      return 'default';
    case ServiceStatus.CANCELLED:
      return 'secondary';
    case ServiceStatus.DELIVERED:
      return 'default';
    case ServiceStatus.PAID:
      return 'default';
    case ServiceStatus.ANNULLATED:
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Función para traducir tipos de servicio al español
const translateServiceType = (type: ServiceType | undefined): string => {
  if (!type) return 'Sin tipo';

  const translations: Record<ServiceType, string> = {
    [ServiceType.REPAIR]: 'Reparación',
    [ServiceType.WARRANTY]: 'Garantía',
    [ServiceType.MAINTENANCE]: 'Mantenimiento',
    [ServiceType.INSPECTION]: 'Inspección',
    [ServiceType.MISELANEOUS]: 'Misceláneo',
    [ServiceType.CUSTOM]: 'Personalizado',
  };

  return translations[type] || type;
};

// Función para traducir estados al español
const translateStatus = (status: ServiceStatus | undefined): string => {
  if (!status) return 'Sin estado';

  const translations: Record<ServiceStatus, string> = {
    [ServiceStatus.PENDING]: 'Pendiente',
    [ServiceStatus.IN_PROGRESS]: 'En Progreso',
    [ServiceStatus.COMPLETED]: 'Completado',
    [ServiceStatus.DELIVERED]: 'Entregado',
    [ServiceStatus.PAID]: 'Pagado',
    [ServiceStatus.ANNULLATED]: 'Anulado',
    [ServiceStatus.CANCELLED]: 'Cancelado',
  };

  return translations[status] || status;
};

export default function ServiceDetailsModal({ serviceId, isOpen, onClose, onStatusChange }: ServiceDetailsModalProps) {
  const { user, currentStore, hasPermission, isAdmin, tenantFeatures, tenantFeaturesLoaded } = useAuth();
  const [currentService, setCurrentService] = useState<ServiceDetail | null>(null);
  const [status, setStatus] = useState<ServiceStatus>(ServiceStatus.IN_PROGRESS);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPendingPayment, setIsLoadingPendingPayment] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: PaymentType.EFECTIVO,
      amount: 0
    }
  ]);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [allServicesCompleted, setAllServicesCompleted] = useState(false);
  const [isCashSessionOpen, setIsCashSessionOpen] = useState(false);
  const [isCompletionConfirmationOpen, setIsCompletionConfirmationOpen] = useState(false);

  const canViewServices = isAdmin || hasPermission?.("VIEW_SERVICES") || hasPermission?.("MANAGE_SERVICES");
  const canManageServices = isAdmin || hasPermission?.("MANAGE_SERVICES");

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasImageUpload = !tenantFeaturesLoaded || normalizedTenantFeatures.includes('IMAGEUPLOAD');
  const hasFastService = !tenantFeaturesLoaded || normalizedTenantFeatures.includes('FASTSERVICE');

  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    if (!serviceId) {
      setCurrentService(null);
      return;
    }

    const currentRequest = ++requestSeqRef.current;

    const loadDetail = async () => {
      try {
        setIsLoading(true);
        const detail = await serviceService.getServiceDetail(serviceId);
        if (currentRequest !== requestSeqRef.current) return;
        setCurrentService(detail);
        setStatus(detail.service.status);
      } catch (error) {
        if (currentRequest !== requestSeqRef.current) return;
        console.error('Error loading service detail:', error);
        const msg = error instanceof Error ? error.message : 'No se pudo cargar el detalle del servicio.';
        toast.error(msg);
        setCurrentService(null);
      } finally {
        if (currentRequest !== requestSeqRef.current) return;
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [isOpen, serviceId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentService) return;

    loadPendingPayment(currentService);
    checkAllServicesCompleted(currentService);
    checkCashSession();
  }, [isOpen, currentService]);

  // Verificar si hay sesión de caja abierta
  const checkCashSession = async () => {
    if (!currentStore) return;
    try {
      const session = await cashService.getCurrentCashSession(currentStore.id);
      setIsCashSessionOpen(!!session && session.status === 'OPEN');
    } catch (error) {
      console.error('Error checking cash session:', error);
      setIsCashSessionOpen(false);
    }
  };

  // Función para verificar si todos los servicios de la orden están completados
  const checkAllServicesCompleted = async (service: ServiceDetail) => {
    try {
      // Obtener la orden para ver todos los servicios
      const order = await orderService.getOrderById(service.order.id);
      
      console.log('🔍 Debug - Checking services completion for order:', order.orderNumber);
      console.log('🔍 Debug - Services in order:', order.services);
      
      // Verificar si todos los servicios están en estado COMPLETED, PAID, DELIVERED o ANNULLATED
      // Los ANNULLATED se consideran "completados" porque ya no requieren acción
      const allCompleted = order.services?.every((s: any) => {
        const isCompleted = s.status === ServiceStatus.COMPLETED || 
                            s.status === ServiceStatus.PAID || 
                            s.status === ServiceStatus.DELIVERED ||
                            s.status === ServiceStatus.ANNULLATED; // ✅ ANNULLATED cuenta como completado
        console.log(`🔍 Service ${s.id} (${s.name}): status=${s.status}, isCompleted=${isCompleted}`);
        return isCompleted;
      }) || false;
      
      console.log('🔍 Debug - All services completed:', allCompleted);
      setAllServicesCompleted(allCompleted);
    } catch (error) {
      console.error('Error checking services completion:', error);
      setAllServicesCompleted(false);
    }
  };

  // Función para cargar el pago pendiente
  const loadPendingPayment = async (service: ServiceDetail) => {
    console.log('🔍🔍🔍 loadPendingPayment START! 🫥');
    console.log('🔍 Debug - loadPendingPayment called for service:', service.service.id);
    
    setIsLoadingPendingPayment(true);
    try {
      console.log('🔍 Debug - About to call serviceService.getServicePendingAmount');
      const pending = await serviceService.getServicePendingAmount(service.service.id);
      console.log('🔍 Debug - Pending payment result from backend:', pending);
      console.log('🔍 Debug - About to setPendingPayment to:', pending);
      setPendingPayment(pending);
      console.log('🔍 Debug - setPendingPayment completed');
    } catch (error) {
      console.error('🔍 Debug - Error in loadPendingPayment:', error);
      console.log('🔍 Debug - Error - setting pendingPayment to 0');
      setPendingPayment(0); // Si hay error, mostrar 0 en lugar del precio completo
      console.log('🔍 Debug - setPendingPayment completed in catch block');
    } finally {
      console.log('🔍 Debug - About to setIsLoadingPendingPayment(false)');
      setIsLoadingPendingPayment(false);
      console.log('🔍🔍🔍 loadPendingPayment END! 🫥');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Funciones para manejar métodos de pago
  const addPaymentMethod = () => {
    setPaymentMethods(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: PaymentType.EFECTIVO,
        amount: 0
      }
    ]);
  };

  const removePaymentMethod = (id: string) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    }
  };

  const updatePaymentMethod = (id: string, field: 'type' | 'amount', value: PaymentTypeValue | number) => {
    setPaymentMethods(prev => 
      prev.map(pm => 
        pm.id === id ? { ...pm, [field]: value } : pm
      )
    );
  };

  // Función para manejar el extorno de pagos en efectivo al anular un servicio
  const handleServiceRefund = async (service: ServiceDetail) => {
    try {
      console.log('🔄 Procesando extorno para servicio:', service.service.id);
      
      // Obtener la caja actual para usar su ID
      if (!currentStore) {
        console.warn('No hay tienda actual, no se puede procesar extorno');
        return;
      }
      
      const currentSession = await cashService.getCurrentCashSession(currentStore.id);
      if (!currentSession) {
        console.warn('No hay sesión de caja abierta, no se puede procesar extorno');
        toast.warning('No hay una sesión de caja abierta. No se puede procesar el extorno automáticamente.');
        return;
      }
      
      // Obtener los pagos del servicio para identificar los de efectivo
      const paymentInfo = await serviceService.getServicePendingPayment(service.service.id);
      console.log('💰 Información de pagos del servicio:', paymentInfo);
      
      // Filtrar solo los pagos en efectivo
      const cashPayments = paymentInfo.paymentBreakdown.filter(payment => 
        payment.type === 'EFECTIVO' && payment.amount > 0
      );
      
      console.log('💵 Pagos en efectivo encontrados:', cashPayments);
      
      if (cashPayments.length === 0) {
        console.log('✅ No hay pagos en efectivo para extornar');
        return;
      }
      
      // Calcular el total a extornar
      const totalRefundAmount = cashPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      if (totalRefundAmount > 0) {
        // Generar movimiento de salida por el total de pagos en efectivo
        const movementData = {
          cashSessionId: currentSession.id,
          amount: totalRefundAmount,
          type: 'EXPENSE' as const,
          payment: 'EFECTIVO',
          description: `Extorno por anulación de servicio - ${service.service.name} (Cliente: ${service.client?.name || 'N/A'})`
        };
        
        console.log('📤 Creando movimiento de extorno:', movementData);
        
        const movement = await cashService.addManualMovement(movementData);
        console.log('✅ Movimiento de extorno creado:', movement);
        
        toast.success(`Se ha generado un extorno de S/ ${totalRefundAmount.toFixed(2)} por pagos en efectivo del servicio anulado.`);
      }
      
    } catch (error) {
      console.error('❌ Error al procesar extorno:', error);
      toast.error('Error al procesar el extorno. Contacte al administrador.');
      // No lanzamos el error para que no se detenga la anulación del servicio
    }
  };

  const updateServiceStatus = async (targetStatus: ServiceStatus) => {
    if (!currentService || !canManageServices) {
      if (!canManageServices) {
        toast.error('No tienes permisos para cambiar el estado de este servicio (MANAGE_SERVICES requerido)');
      }
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Si se está anulando el servicio, verificar si hay pagos en efectivo para extornar
      if (targetStatus === ServiceStatus.ANNULLATED) {
        await handleServiceRefund(currentService);
      }
      
      // Usar el endpoint para actualizar solo el estado
      const updatedService = await serviceService.updateServiceStatus(currentService.service.id, targetStatus);
      
      // Mostrar notificación de éxito
      toast.success('Estado del servicio actualizado correctamente');
      
      // Actualizar el servicio local para reflejar los cambios inmediatamente
      setCurrentService((prev: any) => ({ ...(prev || {}), ...(updatedService as any) }));
      setStatus(targetStatus);
      
      // Actualizar la lista en el componente padre
      onStatusChange();
      
      // Cerrar el modal después de un corto retraso para mostrar el mensaje
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error: unknown) {
      console.error('Error updating service status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el estado del servicio';
      
      // Mostrar el error específico del backend
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = () => {
    if (!canManageServices) {
      toast.error('No tienes permisos para cambiar el estado de este servicio (MANAGE_SERVICES requerido)');
      return;
    }
    if (!currentService) return;
    if (status) {
      if (status === currentService.service.status) return;
      const confirmed = window.confirm(
        `¿Confirmas cambiar el estado del servicio de "${translateStatus(currentService.service.status)}" a "${translateStatus(status)}"?`
      );
      if (!confirmed) return;
      updateServiceStatus(status);
    }
  };

  // Función principal para ejecutar el pago
  const executePayment = async (shouldCompleteService: boolean) => {
    if (!currentService) return;

    if (!canManageServices) {
      toast.error('No tienes permisos para registrar pagos de servicios (MANAGE_SERVICES requerido)');
      return;
    }

    try {
      setIsProcessingPayment(true);
      
      // Preparar los datos para el endpoint de pago
      const paymentData = {
        orderId: currentService.order.id,
        services: [{
          serviceId: currentService.service.id,
          payments: paymentMethods.map(pm => ({
            type: pm.type,
            amount: pm.amount
          }))
        }]
      };
      
      // Llamar al endpoint para procesar el pago
      try {
        await orderService.completeOrder(paymentData);
      } catch (error: any) {
        if (error?.response?.status === 429) {
          throw new Error('Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.');
        }
        throw error;
      }
      
      const totalPayment = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);

      // Mostrar éxito con mensaje personalizado
      if (shouldCompleteService && allServicesCompleted) {
        toast.success('¡Orden finalizada correctamente! Todos los servicios están completados y pagados.');
      } else {
        toast.success(`Pago de S/${totalPayment.toFixed(2)} procesado correctamente`);
      }

      // Lógica para registrar movimiento en caja actual (MANTENIDA IGUAL)
      try {
        if (currentStore) {
          const currentSession = await cashService.getCurrentCashSession(currentStore.id);
          
          if (currentSession && currentSession.status === 'OPEN') {
              const order = await orderService.getOrderById(currentService.order.id);
              
              let shouldCreateManualMovement = false;

              if (order.cashSessionId) {
                shouldCreateManualMovement = order.cashSessionId !== currentSession.id;
              } else {
                const orderTime = new Date(order.createdAt).getTime();
                const sessionOpenTime = new Date(currentSession.openedAt).getTime();
                shouldCreateManualMovement = orderTime < sessionOpenTime;
              }
              
              if (shouldCreateManualMovement) {
                   console.log('Registrando movimiento manual en sesión actual por pago diferido');
                   await cashService.addManualMovement({
                      cashSessionId: currentSession.id,
                      amount: totalPayment,
                      type: 'INCOME',
                      payment: paymentMethods.map((pm) => pm.type).filter(Boolean).join('+') || 'EFECTIVO',
                      description: `Pago servicio ${currentService.service.name} - Orden ${order.orderNumber || order.id.substring(0, 8)}`
                   });
                   toast.success('Ingreso registrado correctamente en la caja del día');
              }
          }
        }
      } catch (error) {
          console.error('Error al intentar registrar movimiento en caja actual:', error);
      }

      // Si se confirmó completar el servicio, hacerlo ahora
      if (shouldCompleteService) {
        await updateServiceStatus(ServiceStatus.COMPLETED);
      }
      
      // Cerrar modales y resetear
      setIsPaymentModalOpen(false);
      setIsCompletionConfirmationOpen(false);
      
      setPaymentMethods([{
        id: "1",
        type: PaymentType.EFECTIVO,
        amount: 0
      }]);
      
      // Recargar datos
      await loadPendingPayment(currentService);
      await checkAllServicesCompleted(currentService);
      onStatusChange();
      
    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
      toast.error(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Función manejadora del botón de pago
  const handlePaymentSubmit = async () => {
    if (!currentService) return;
    if (isProcessingPayment) return;

    if (paymentMethods.some((pm) => typeof pm.amount !== 'number' || Number.isNaN(pm.amount) || pm.amount < 0)) {
      toast.error('No se permiten montos negativos. Verifica los métodos de pago.');
      return;
    }
    
    const totalPayment = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    
    if (totalPayment <= 0) {
      toast.error('El monto del pago debe ser mayor a 0');
      return;
    }
    
    // Validación especial para "Finalizar orden"
    if (allServicesCompleted && totalPayment !== pendingPayment) {
      toast.error(`Para finalizar la orden, el monto debe ser exactamente S/${pendingPayment.toFixed(2)}. Ingresaste: S/${totalPayment.toFixed(2)}`);
      return;
    }
    
    // Para "Adelantar pago"
    if (!allServicesCompleted && totalPayment > pendingPayment) {
      toast.error(`El monto ingresado (S/${totalPayment.toFixed(2)}) excede el pago pendiente (S/${pendingPayment.toFixed(2)})`);
      return;
    }

    // Verificar si este pago completará el servicio (pago total)
    const isFullPayment = Math.abs(totalPayment - pendingPayment) < 0.1;
    
    // Solo tiene sentido ofrecer "finalizar servicio/orden" si el servicio actual
    // todavía está EN PROGRESO. Si ya está COMPLETED/PAID/etc., no mostramos el modal.
    if (isFullPayment && currentService.service.status === ServiceStatus.IN_PROGRESS) {
      try {
        const order = await orderService.getOrderById(currentService.order.id);
        // Verificar si todos los demás servicios están listos
        const otherServices = order.services?.filter((s: any) => s.id !== currentService.service.id) || [];
        const areOthersCompleted = otherServices.every((s: any) => 
          s.status === ServiceStatus.COMPLETED || 
          s.status === ServiceStatus.PAID || 
          s.status === ServiceStatus.DELIVERED ||
          s.status === ServiceStatus.ANNULLATED
        );

        if (areOthersCompleted) {
          // Si todo está listo para finalizar, PREGUNTAR al usuario
          setIsCompletionConfirmationOpen(true);
          return;
        }
      } catch (error) {
        console.error('Error verificando finalización automática:', error);
      }
    }

    // Si no requiere confirmación, ejecutar pago sin completar servicio automáticamente
    await executePayment(false);
  };

  if (!currentService) return null;

  // Función para validar URLs de imágenes
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      // Verificar si es una URL válida
      new URL(url);
      // Verificar si es una URL base64 (para imágenes en base64)
      if (url.startsWith('data:image/')) return true;
      // Verificar extensiones de imagen comunes
      return /\.(jpeg|jpg|gif|png|webp|svg|avif)$/i.test(url.split('?')[0]);
    } catch {
      return false;
    }
  };

  // Filtrar solo URLs de imágenes válidas
  const validPhotoUrls: string[] = (currentService.service.photoUrls || []).filter((url: string) =>
    url && isValidImageUrl(url)
  );

  // Función para renderizar la galería de imágenes
  const renderImageGallery = () => {
    if (validPhotoUrls.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
          <ImageOff className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            No hay imágenes disponibles para este servicio
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {validPhotoUrls.map((url: string, index: number) => (
            <div 
              key={`${url}-${index}`} 
              className="relative aspect-square group"
            >
              <button
                className="absolute inset-0 w-full h-full"
                onClick={() => {
                  setSelectedImage(url);
                  setSelectedImageIndex(index);
                  setIsImageViewerOpen(true);
                }}
                aria-label={`Ver imagen ${index + 1} en tamaño completo`}
              >
                <div className="absolute inset-0 rounded-md overflow-hidden border">
                  <Image
                    src={url}
                    alt={`Imagen del servicio ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    onLoadingComplete={() => setIsImageLoading(false)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      setIsImageLoading(false);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[75vh] sm:max-h-[80vh] flex flex-col min-h-0">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Detalles del Servicio</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(currentService?.service?.status)}>
                {translateStatus(currentService?.service?.status)}
              </Badge>
              <Badge variant={pendingPayment > 0 ? 'secondary' : 'default'}>
                {pendingPayment > 0 ? 'Pago pendiente' : 'Pagado'}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4 overflow-y-auto min-h-0 max-h-[50vh] sm:max-h-[60vh]">
            {isLoading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : (
              <div className="grid gap-3 py-2 overflow-hidden">
                {/* Información del Servicio */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{currentService?.service?.name?.charAt(0) || 'S'}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentService?.service?.name || 'N/A'}</h3>
                        <p className="text-sm text-muted-foreground">{translateServiceType(currentService?.service?.type)}</p>
                      </div>
                    </div>
                    
                    {currentService?.service?.description && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                        <p className="mt-1 text-sm">{currentService.service.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Precio</Label>
                        <p className="mt-1 font-semibold text-lg">
                          {new Intl.NumberFormat('es-PE', {
                            style: 'currency',
                            currency: 'PEN',
                          }).format(currentService?.service?.price || 0)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                        <div className="mt-1">
                          <Badge variant={getStatusVariant(currentService?.service?.status)}>
                            {translateStatus(currentService?.service?.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información del Cliente y Orden */}
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Información del Cliente</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                          <p className="font-medium">{currentService?.client?.name || 'No especificado'}</p>
                        </div>
                        {currentService?.client?.phone && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                            <p className="text-sm">{currentService.client.phone}</p>
                          </div>
                        )}
                        {currentService?.client?.email && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <p className="text-sm">{currentService.client.email}</p>
                          </div>
                        )}
                        {currentService?.client?.address && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                            <p className="text-sm">{currentService.client.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Información de la Orden</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">N° de Orden</Label>
                          <p className="font-medium">{currentService?.order?.orderNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total de la Orden</Label>
                          <p className="font-medium">
                            {new Intl.NumberFormat('es-PE', {
                              style: 'currency',
                              currency: 'PEN',
                            }).format(currentService?.order?.totalAmount || 0)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Fecha de Creación</Label>
                          <p className="text-sm">{currentService?.order?.createdAt ? format(new Date(currentService.order.createdAt), 'PPP', { locale: es }) : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Estado del Pago */}
                {!hasFastService && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-orange-900">Estado del Pago</h4>
                        {isLoadingPendingPayment ? (
                          <p className="text-sm text-orange-700">Calculando...</p>
                        ) : (
                          <div className="mt-1">
                            <p className={`font-semibold text-lg ${pendingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {new Intl.NumberFormat('es-PE', {
                                style: 'currency',
                                currency: 'PEN',
                              }).format(pendingPayment)}
                            </p>
                            <p className="text-sm text-orange-700">
                              {pendingPayment > 0 ? 'Pendiente de pago' : 'Servicio completamente pagado'}
                            </p>
                          </div>
                        )}
                      </div>
                      <Badge variant={pendingPayment > 0 ? 'secondary' : 'default'} className="text-sm">
                        {pendingPayment > 0 ? 'Pendiente' : 'Pagado'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Imágenes */}
                {hasImageUpload && currentService?.service.photoUrls && currentService.service.photoUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">Imágenes del Servicio</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {currentService.service.photoUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80" onClick={() => {
                          setSelectedImageIndex(index);
                          setIsImageViewerOpen(true);
                        }}>
                          <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Información Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">Categoría</Label>
                    <p className="font-medium">{currentService?.serviceCategory?.name || 'Sin categoría'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">Tienda</Label>
                    <p className="font-medium">{currentService?.order.storeName || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">Fecha del Servicio</Label>
                    <p className="font-medium">{currentService?.service?.createdAt ? format(new Date(currentService.service.createdAt), 'PPP', { locale: es }) : 'N/A'}</p>
                  </div>
                </div>

                {/* Cambio de Estado */}
                {canManageServices && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Cambiar Estado</h4>
                    <div className="space-y-2">
                      <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as ServiceStatus)}
                        disabled={isLoading || !canManageServices || currentService?.service?.status === ServiceStatus.ANNULLATED}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {/* Botón de pago solo si hay pago pendiente y el usuario puede gestionar servicios */}
            {pendingPayment > 0 && canManageServices && (
              <div className="flex flex-col items-end">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={
                    isLoadingPendingPayment ||
                    !isCashSessionOpen
                  }
                  className={!isCashSessionOpen ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {allServicesCompleted ? 'Finalizar orden' : 'Adelantar pago'}
                </Button>
                {!isCashSessionOpen && (
                  <span className="text-[10px] text-red-500 mt-1">La caja está cerrada</span>
                )}
              </div>
            )}
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cerrar
            </Button>
            {!hasFastService && (
              <Button 
                onClick={handleStatusUpdate} 
                disabled={
                  isLoading ||
                  !canManageServices ||
                  status === currentService.service.status
                }
              >
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visor de imágenes a pantalla completa */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>
          {selectedImage && (
            <div className="relative w-full h-[80vh]">
              <Image
                src={selectedImage}
                alt="Vista previa de la imagen"
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsImageViewerOpen(false)}
              className="mt-4"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para completar servicio/orden */}
      <Dialog open={isCompletionConfirmationOpen} onOpenChange={setIsCompletionConfirmationOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>¿Completar Servicio y Orden?</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">
              Este pago cubrirá el saldo total y todos los demás servicios de la orden ya están completados.
            </p>
            <p className="font-medium text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              ¿Deseas COMPLETAR el servicio? y finalizar la venta automaticamente?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-2">
            <Button 
              variant="outline" 
              onClick={() => executePayment(false)}
              disabled={isProcessingPayment || !canManageServices}
              className="sm:order-1"
            >
              No, solo registrar pago
            </Button>
            <Button 
              variant="default"
              onClick={() => executePayment(true)}
              disabled={isProcessingPayment || !canManageServices}
              className="bg-green-600 hover:bg-green-700 text-white sm:order-2"
            >
              {isProcessingPayment ? 'Procesando...' : 'Sí, finalizar la venta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de pago */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adelantar pago - {currentService?.service.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pago pendiente actual</Label>
              <p className="text-lg font-semibold text-orange-600">
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN'
                }).format(pendingPayment)}
              </p>
              {allServicesCompleted && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Todos los servicios están completados. Para finalizar la orden, debes pagar exactamente el monto pendiente.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Métodos de pago</Label>
              {paymentMethods.map((paymentMethod, index) => (
                <div key={paymentMethod.id} className="flex gap-2">
                  <select
                    value={paymentMethod.type}
                    onChange={(e) => updatePaymentMethod(paymentMethod.id, 'type', e.target.value as PaymentTypeValue)}
                    className="flex-1 p-2 border rounded text-sm"
                  >
                    <option value={PaymentType.EFECTIVO}>Efectivo</option>
                    <option value={PaymentType.TARJETA}>Tarjeta</option>
                    <option value={PaymentType.TRANSFERENCIA}>Transferencia</option>
                    <option value={PaymentType.YAPE}>Yape</option>
                    <option value={PaymentType.PLIN}>Plin</option>
                    <option value={PaymentType.DATAPHONE}>Datáfono</option>
                    <option value={PaymentType.BIZUM}>Bizum</option>
                    <option value={PaymentType.OTRO}>Otro</option>
                  </select>
                  
                  <input
                    type="number"
                    value={paymentMethod.amount}
                    onChange={(e) => updatePaymentMethod(paymentMethod.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-24 p-2 border rounded text-sm"
                    placeholder="Monto"
                    min="0"
                    step="0.01"
                  />
                  
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(paymentMethod.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentMethod}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar método de pago
              </Button>
              
              <div className="text-sm text-muted-foreground text-right">
                Total a pagar: S/{paymentMethods.reduce((sum, pm) => sum + pm.amount, 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPaymentModalOpen(false);
                // Resetear métodos de pago
                setPaymentMethods([{
                  id: "1",
                  type: PaymentType.EFECTIVO,
                  amount: 0
                }]);
              }}
              disabled={isProcessingPayment}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handlePaymentSubmit}
              disabled={isProcessingPayment || paymentMethods.reduce((sum, pm) => sum + pm.amount, 0) <= 0}
            >
              {isProcessingPayment ? 'Procesando...' : 'Confirmar pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
