import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, XCircle, Download, Printer, AlertCircle, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import { PDFViewer, pdf, PDFDownloadLink } from "@react-pdf/renderer";
import ReceiptThermalPDF from "@/app/dashboard/ventas/ReceiptThermalPDF";
import { CancelOrderDialog, type CancelOrderInfo } from "./CancelOrderDialog";
import { Order, OrderProduct, type PaymentTypeInput } from '@/services/order.service';
import { storeProductService } from '@/services/store-product.service';
import { orderService } from '@/services/order.service';
import { SaleData } from '@/types/sale.types';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { serviceService, ServiceStatus } from '@/services/service.service';
import { cashService } from '@/services/cash.service';

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onOrderUpdate?: (order: Order) => void;
}

type OrderStatus = keyof typeof statusColors;

const calculateOrderStatus = (order: Order): OrderStatus => {
  // Si la orden está cancelada en la base de datos, devolver CANCELLED
  if (order.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (order.status === 'PAID') {
    return 'PAID';
  }

  if (order.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  // Mantener el estado actual por defecto, asegurando que sea un valor válido
  let calculatedStatus: OrderStatus = (order.status in statusColors) 
    ? order.status as OrderStatus 
    : 'PENDING';

  // Solo aplicar la lógica de servicios si la orden tiene servicios
  // y el estado actual es PENDING (para no sobreescribir PAID/COMPLETED).
  if (calculatedStatus === 'PENDING' && order.services && order.services.length > 0) {
    const nonCanceledServices = order.services.filter(service => service.status !== 'ANNULLATED');
    
    if (nonCanceledServices.length > 0) {
      calculatedStatus = nonCanceledServices.every(service => service.status === 'COMPLETED') 
        ? 'COMPLETED' 
        : 'PENDING';
    }
  }

  return calculatedStatus;
};

const statusColors = {
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELIVERED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PAID: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  ANNULLATED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
} as const;

// Función para traducir tipos de servicio al español
const translateServiceType = (type: string | undefined): string => {
  if (!type) return 'Sin tipo';

  const translations: Record<string, string> = {
    'REPAIR': 'Reparación',
    'WARRANTY': 'Garantía',
    'MISELANEOUS': 'Misceláneo',
    'MAINTENANCE': 'Mantenimiento',
    'INSTALLATION': 'Instalación',
    'DIAGNOSTIC': 'Diagnóstico',
    'OTHER': 'Otro',
    'IN_PROGRESS': 'En Progreso',
    'COMPLETED': 'Completado',
    'PENDING': 'Pendiente',
    'CANCELLED': 'anulado',
    'PAID': 'Pagado',
  };

  return translations[type] || type.replace('_', ' ');
};

interface ProductMap {
  [key: string]: { name: string; price: number; description?: string };
}

enum PaymentType {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  DATAPHONE = 'DATAPHONE',
  BIZUM = 'BIZUM',
  OTRO = 'OTRO',
}

type PaymentTypeValue = PaymentTypeInput;

type PaymentMethod = {
  id: string;
  type: PaymentTypeValue;
  amount: number;
};

interface PaymentEntry {
  id: string;
  type?: string;
  amount: number;
  createdAt?: string;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, onOpenChange, order, onOrderUpdate }) => {
  const { user, currentStore, canIssuePdf, tenantFeatures, hasPermission, isAdmin: isAdminFromContext } = useAuth();
  const { canManageOrders: canManageOrdersFn, canDetailOrders: canDetailOrdersFn } = usePermissions();
  const canManageOrders = canManageOrdersFn();
  const canDetailOrders = canDetailOrdersFn();
  const canFetchOrderDetails =
    hasPermission('DETAIL_ORDERS') &&
    (hasPermission('VIEW_OWN_ORDERS_HISTORY') || hasPermission('VIEW_ALL_ORDERS_HISTORY') || isAdminFromContext);
  const [showPDF, setShowPDF] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const [isCompleteAfterPaymentDialogOpen, setIsCompleteAfterPaymentDialogOpen] = useState(false);
  const [productMap, setProductMap] = useState<ProductMap>({});
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [isLoadingPendingPayment, setIsLoadingPendingPayment] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: PaymentType.EFECTIVO, amount: 0 },
  ]);
  const [showAdvanceDetails, setShowAdvanceDetails] = useState(false);

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN';
  const canManageServices = isAdmin || isAdminFromContext || hasPermission?.('MANAGE_SERVICES');

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasNamedServices = normalizedTenantFeatures.includes('NAMEDSERVICES');
  const hasClientsFeature = normalizedTenantFeatures.includes('CLIENTS');

  // Información del negocio (hardcodeada ya que useBusinessInfo no existe)
  const businessInfo = {
    name: "TECNICENTRO JR",
    address: "Jr Chanchamayo 650, puesto 1 y 2",
    phone: "+51 993 485 170",
    email: "tecnicentrojrcajamarca@gmail.com",
    footerText: "Gracias por su compra. Vuelva pronto.",
  };

  // Cargar detalles de la orden cuando se abre el diálogo
  useEffect(() => {
    if (open && order?.id) {
      const loadDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const details = await orderService.getOrderDetails(order.id);
          setOrderDetails(details);
        } catch (error) {
          console.error('Error al cargar detalles de la orden:', error);
          toast.error('No se pudieron cargar los detalles de la orden');
          setOrderDetails(null);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadDetails();
    } else {
      setOrderDetails(null);
    }
  }, [open, order?.id]);

  useEffect(() => {
    if (!open) {
      setIsLoadingPendingPayment(false);
      setIsPaymentModalOpen(false);
      setPaymentMethods([{ id: '1', type: PaymentType.EFECTIVO, amount: 0 }]);
      setShowAdvanceDetails(false);
      setIsCompleteAfterPaymentDialogOpen(false);
      return;
    }
  }, [open]);


  const displayProducts = useMemo(() => {
    if (orderDetails?.productos) {
      return orderDetails.productos.map((p: any) => ({
        id: p.productId || p.id,
        productId: p.productId || p.id,
        quantity: p.cantidad || p.quantity,
        unitPrice: p.precioUnitario || p.price,
        product: {
          name: p.nombre || p.name,
          description: p.descripcion || p.description,
        },
      }));
    }

    return order?.orderProducts || [];
  }, [orderDetails?.productos, order?.orderProducts]);

  const displayServices = useMemo(() => {
    if (orderDetails?.servicios) {
      return orderDetails.servicios.map((s: any) => ({
        id: s.id,
        name: s.nombre || s.name,
        description: s.descripcion || s.description,
        price: s.precio || s.price,
        type: s.type,
        status: s.status,
        photoUrls: s.photoUrls,
      }));
    }

    return order?.services || [];
  }, [orderDetails?.servicios, order?.services]);

  const orderStatus = useMemo<OrderStatus>(() => {
    if (!order) return 'PENDING';
    return calculateOrderStatus(order);
  }, [order]);

  const canShowActionButtons = orderStatus !== 'COMPLETED' && orderStatus !== 'CANCELLED';

  const isOnlyProductsOrder = useMemo(() => {
    const productsCount = (displayProducts?.length || 0);
    const servicesCount = (displayServices?.length || 0);
    return productsCount > 0 && servicesCount === 0;
  }, [displayProducts, displayServices]);

  const handleCancelOrder = async (refundMethods: Array<{ type: PaymentTypeInput; amount: number }> = []) => {
    if (!order) return;
    
    setIsCanceling(true);
    try {
      // 1. Cancelar la orden enviando métodos de reembolso si se proporcionan
      const updatedOrder = await orderService.cancelOrder(order.id, refundMethods);

      // 2. Actualizar el estado local de la orden
      if (onOrderUpdate) {
        onOrderUpdate({
          ...order,
          status: 'CANCELLED' as const
        });
      }
      
      toast.success("Orden anulada", {
        description: "La orden ha sido anulada exitosamente y el stock de los productos ha sido restaurado.",
      });
      
      setShowCancelDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al anular la orden:", error);
      toast.error("Error al anular la orden", {
        description: "Ocurrió un error al intentar anular la orden. Verifique sus credenciales e intente nuevamente.",
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order?.id) return;

    if (!canManageOrders) {
      toast.error('No tienes permisos para completar órdenes (MANAGE_ORDERS requerido)');
      return;
    }

    if (isOnlyProductsOrder) {
      return;
    }

    if (orderPendingAmount > 0) {
      toast.error('La orden aún tiene pagos pendientes');
      return;
    }

    try {
      setIsCompletingOrder(true);

      const result = await orderService.completeOrderById(order.id);
      if (!result?.success) {
        toast.error('No se pudo completar la orden');
        return;
      }

      toast.success('Orden completada correctamente');

      // Cerrar modales internos
      setIsPaymentModalOpen(false);
      setShowCancelDialog(false);
      setShowPDF(false);

      // Refrescar orden en el padre (para que refresque la lista)
      if (onOrderUpdate) {
        if (canDetailOrders) {
          try {
            const updatedOrder = await orderService.getOrderById(order.id);
            onOrderUpdate(updatedOrder);
          } catch (error) {
            console.error('Error fetching updated order:', error);
            onOrderUpdate(order);
          }
        } else {
          onOrderUpdate(order);
        }
      }

      // Cerrar modal principal
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('No se pudo completar la orden');
    } finally {
      setIsCompletingOrder(false);
    }
  };
  
  const getProductInfo = (item: OrderProduct) => {
    if (item.product) {
      // La estructura real incluye un objeto anidado 'product'
      const productData = item.product as any;
      return {
        ...item.product,
        name: productData.product?.name || `Producto ${item.productId?.substring(0, 6) || 'N/A'}`,
        price: item.unitPrice || (item as any).price || 0
      };
    }
    if (item.productId && productMap[item.productId]) {
      return {
        ...productMap[item.productId],
        price: item.unitPrice || (item as any).price || 0
      };
    }
    return {
      name: `Producto ${item.productId?.substring(0, 6) || 'N/A'}`,
      price: item.unitPrice || (item as any).price || 0,
      description: ''
    };
  };

  // Función para cargar productos de forma más directa
  const loadProductsIfNeeded = async () => {
    if (!order?.orderProducts?.length || Object.keys(productMap).length > 0) {
      return;
    }

    // Recolectar IDs únicos de productos de la orden
    const productIds = Array.from(new Set(
      order.orderProducts
        .filter(item => item.productId)
        .map(item => item.productId)
    ));

    if (productIds.length === 0) {
      return;
    }

    try {
      if (!currentStore?.id) {
        return;
      }
      
      const allProductsResponse = await storeProductService.getStoreProducts(currentStore.id, 1, 1000);
      
      const newProductMap: ProductMap = {};
      
      // Para cada productId (storeProductId) en la orden, buscar el producto correspondiente
      productIds.forEach(storeProductId => {
        const storeProduct = allProductsResponse.data.find(p => p.id === storeProductId);
        if (storeProduct && storeProduct.product) {
          newProductMap[storeProductId] = {
            name: storeProduct.product.name,
            price: 0, // No usamos el precio del producto, usaremos item.unitPrice
            description: typeof storeProduct.product.description === 'string' ? storeProduct.product.description : ''
          };
        }
      });

      setProductMap(newProductMap);
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  // Cargar productos cuando el diálogo se abra con una orden
  useEffect(() => {
    if (open && order && order.orderProducts && order.orderProducts.length > 0) {
      loadProductsIfNeeded();
    }
  }, [open, order?.id]); // Cambiar a order.id para evitar loops

  if (!order) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP p", { locale: es });
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return false;
    }
  };


  const namedServiceName = displayServices?.[0]?.name;

  const selectedService = useMemo(() => displayServices[0] || null, [displayServices]);

  const paymentEntries = useMemo<PaymentEntry[]>(() => {
    const source = (orderDetails?.paymentMethods?.length ? orderDetails.paymentMethods : order?.paymentMethods) || [];
    return source.map((method: any, index: number) => ({
      id: method.id || `${method.type}-${index}`,
      type: method.type,
      amount: Number(method.amount || 0),
      createdAt: method.createdAt,
    }));
  }, [orderDetails?.paymentMethods, order?.paymentMethods]);

  const orderPendingAmount = useMemo(() => {
    if (!orderDetails) return 0;

    const totalAmount = Number(orderDetails.total ?? 0) || 0;
    const totalPaid = (orderDetails.paymentMethods || []).reduce(
      (sum: number, method: any) => sum + (Number(method?.amount) || 0),
      0
    );

    return Math.max(totalAmount - totalPaid, 0);
  }, [orderDetails]);

  const cancelOrderInfo = useMemo<CancelOrderInfo | null>(() => {
    if (!order) {
      return null;
    }

    const productsList = (displayProducts || [])
      .map((product: any) => ({
        name: product?.product?.name || product?.product?.nombre || product?.name || "Producto",
        quantity: product?.quantity,
      }))
      .filter((item: { name?: string }) => Boolean(item.name));

    const servicesList = (displayServices || [])
      .map((service: any) => ({
        name: service?.name || service?.nombre || "Servicio",
      }))
      .filter((item: { name?: string }) => Boolean(item.name));

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(orderDetails?.total ?? order.totalAmount ?? 0),
      products: productsList.length ? productsList : undefined,
      services: servicesList.length ? servicesList : undefined,
    };
  }, [order, orderDetails?.total, order?.totalAmount, displayProducts, displayServices]);

  const sellerDisplayName = useMemo(() => {
    const pickString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    
    const detailsSeller =
      pickString(orderDetails?.vendedor) ||
      pickString(orderDetails?.sellerName) ||
      pickString(orderDetails?.seller) ||
      pickString(orderDetails?.vendedorNombre) ||
      pickString(orderDetails?.createdByName) ||
      pickString(orderDetails?.user?.name) ||
      pickString(orderDetails?.userName);    
    if (detailsSeller) return detailsSeller;

    const directSellerName = (order as any)?.sellerName?.trim?.() || (order as any)?.createdByName?.trim?.();
    if (directSellerName) return directSellerName;
    const userName = order?.user?.name?.trim();
    if (userName) return userName;
    if (order?.user?.email) return order.user.email;
    return 'Sin vendedor asignado';
  }, [orderDetails?.vendedor, order, order?.user?.name, order?.user?.email]);

  const totalPayment = useMemo(
    () => paymentMethods.reduce((sum, pm) => sum + (Number(pm.amount) || 0), 0),
    [paymentMethods]
  );

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => [
      ...prev,
      { id: Date.now().toString(), type: PaymentType.EFECTIVO, amount: 0 },
    ]);
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => (prev.length > 1 ? prev.filter((pm) => pm.id !== id) : prev));
  };

  const updatePaymentMethod = (id: string, field: 'type' | 'amount', value: PaymentTypeValue | number) => {
    setPaymentMethods((prev) => prev.map((pm) => (pm.id === id ? { ...pm, [field]: value } : pm)));
  };

  const handleServiceRefund = async (service: any) => {
    try {
      if (!currentStore) return;

      const currentSession = await cashService.getCurrentCashSession(currentStore.id);
      if (!currentSession || currentSession.status !== 'OPEN') return;

      const paymentInfo = await serviceService.getServicePendingPayment(service.id);
      const cashPayments = paymentInfo.paymentBreakdown?.filter((payment: any) =>
        payment.type === 'EFECTIVO' && payment.amount > 0
      ) || [];

      if (cashPayments.length === 0) return;

      const totalRefundAmount = cashPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      if (totalRefundAmount > 0) {
        await cashService.addManualMovement({
          cashSessionId: currentSession.id,
          amount: totalRefundAmount,
          type: 'EXPENSE',
          payment: 'EFECTIVO',
          description: `Extorno por anulación de servicio - ${service.name || service.id} (Orden ${order?.orderNumber || order?.id?.substring(0, 8)})`,
        });
        toast.success(`Se ha generado un extorno de S/ ${totalRefundAmount.toFixed(2)} por pagos en efectivo del servicio anulado.`);
      }
    } catch (error) {
      console.error('Error al procesar extorno:', error);
      toast.error('Error al procesar el extorno. Contacte al administrador.');
    }
  };

  const updateServiceStatus = async (targetStatus: ServiceStatus) => {
    if (!canManageServices) {
      toast.error('No tienes permisos para cambiar el estado de este servicio (MANAGE_SERVICES requerido)');
      return;
    }

    try {
      if (targetStatus === ServiceStatus.ANNULLATED) {
        if (selectedService) {
          await handleServiceRefund(selectedService);
        }
      }

      if (!selectedService) {
        toast.error('No hay servicios disponibles para actualizar.');
        return;
      }

      await serviceService.updateServiceStatus(selectedService.id, targetStatus);
      toast.success('Estado del servicio actualizado correctamente');

      setIsPaymentModalOpen(false);
      onOpenChange(false);

      if (onOrderUpdate && order?.id) {
        if (canDetailOrders) {
          try {
            const updatedOrder = await orderService.getOrderById(order.id);
            onOrderUpdate(updatedOrder);
          } catch (error) {
            console.error('Error fetching updated order:', error);
            onOrderUpdate(order);
          }
        } else {
          onOrderUpdate(order);
        }
      }
    } catch (error: unknown) {
      console.error('Error updating service status:', error);
      const msg = error instanceof Error ? error.message : 'Error al actualizar el estado del servicio';
      toast.error(msg);
    }
  };

  const executeServicePayment = async (completeAfterPayment?: boolean) => {
    if (!order?.id) return;

    if (!canManageOrders) {
      toast.error('No tienes permisos para registrar pagos de órdenes (MANAGE_ORDERS requerido)');
      return;
    }

    const totalPayment = paymentMethods.reduce((sum, pm) => sum + (Number(pm.amount) || 0), 0);
    if (totalPayment <= 0) {
      toast.error('Ingresa un monto mayor a 0');
      return;
    }

    if (orderPendingAmount > 0 && totalPayment > orderPendingAmount) {
      toast.error('El pago no puede ser mayor al monto pendiente');
      return;
    }

    try {
      setIsProcessingPayment(true);

      await orderService.addOrderPayments(order.id, paymentMethods.map((pm) => ({
        type: pm.type,
        amount: Number(pm.amount) || 0,
      })));
      toast.success(`Pago de S/${totalPayment.toFixed(2)} procesado correctamente`);

      if (completeAfterPayment) {
        try {
          await orderService.completeOrderById(order.id);
          toast.success('Orden completada correctamente');
        } catch (error) {
          console.error('Error completing order after payment:', error);
          toast.error('El pago se registró, pero no se pudo completar la orden');
        }
      }

      // Registrar movimiento en la caja actual si el pago pertenece a una orden de otra sesión
      // (misma lógica que ServiceDetailsModal para pagos diferidos)
      try {
        if (currentStore) {
          const currentSession = await cashService.getCurrentCashSession(currentStore.id);
          if (currentSession && currentSession.status === 'OPEN') {
            const freshOrder = canDetailOrders ? await orderService.getOrderById(order.id) : order;

            let shouldCreateManualMovement = false;
            if (freshOrder.cashSessionId) {
              shouldCreateManualMovement = freshOrder.cashSessionId !== currentSession.id;
            } else {
              const orderTime = new Date(freshOrder.createdAt).getTime();
              const sessionOpenTime = new Date(currentSession.openedAt || Date.now()).getTime();
              shouldCreateManualMovement = orderTime < sessionOpenTime;
            }

            if (shouldCreateManualMovement) {
              await cashService.addManualMovement({
                cashSessionId: currentSession.id,
                amount: totalPayment,
                type: 'INCOME',
                payment: paymentMethods.map((pm) => pm.type).filter(Boolean).join('+') || 'EFECTIVO',
                description: `Pago orden ${freshOrder.orderNumber || freshOrder.id.substring(0, 8)}`,
              });
              toast.success('Ingreso registrado correctamente en la caja del día');
            }
          }
        }
      } catch (error) {
        console.error('Error al intentar registrar movimiento en caja actual:', error);
      }

      // Recargar detalles y pendiente
      if (canDetailOrders) {
        try {
          setIsLoadingDetails(true);
          const details = await orderService.getOrderDetails(order.id);
          setOrderDetails(details);
        } catch (error) {
          console.error('Error al recargar detalles de la orden:', error);
        } finally {
          setIsLoadingDetails(false);
        }
      }

      setPaymentMethods([{ id: '1', type: PaymentType.EFECTIVO, amount: 0 }]);
      setIsPaymentModalOpen(false);
      onOpenChange(false);
      if (onOrderUpdate && order?.id) {
        if (canDetailOrders) {
          try {
            const updatedOrder = await orderService.getOrderById(order.id);
            onOrderUpdate(updatedOrder);
          } catch (error) {
            console.error('Error fetching updated order:', error);
            onOrderUpdate(order);
          }
        } else {
          onOrderUpdate(order);
        }
      }
    } catch (error) {
      console.error('Error processing service payment:', error);
      toast.error('No se pudo procesar el pago del servicio');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const isFullPayment = useMemo(() => {
    if (!orderPendingAmount) return false;
    return Math.abs(totalPayment - orderPendingAmount) < 0.01;
  }, [orderPendingAmount, totalPayment]);

  const handleRegisterPayment = () => {
    if (!order?.id) return;

    if (!canManageOrders) {
      toast.error('No tienes permisos para registrar pagos de órdenes (MANAGE_ORDERS requerido)');
      return;
    }

    if (totalPayment <= 0) {
      toast.error('Ingresa un monto mayor a 0');
      return;
    }

    if (orderPendingAmount > 0 && totalPayment > orderPendingAmount) {
      toast.error('El pago no puede ser mayor al monto pendiente');
      return;
    }

    // Si cubre exactamente el pendiente, preguntar si desea completar
    if (isFullPayment && !isOnlyProductsOrder) {
      setIsCompleteAfterPaymentDialogOpen(true);
      return;
    }

    executeServicePayment(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[95%] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 border-b border-border flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="text-lg sm:text-xl font-semibold">Detalles de la Venta</DialogTitle>
            <Badge className={statusColors[orderStatus]}>
              {translateServiceType(orderStatus)}
            </Badge>
          </div>
        </div>
        
        {/* Layout principal: contenido + acciones */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Contenido con scroll - más ancho */}
          <div className="flex-[2] min-h-0 overflow-y-auto p-6">
              {isLoadingDetails ? (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">Cargando detalles completos...</p>
                </div>
              ) : (
                <>
                {/* Información General */}
            <div className="space-y-2">
              <h3 className="font-medium">Información General</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Numero de Orden</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">S/{Number(order.totalAmount || 0).toFixed(2)}</p>
                </div>
                {hasNamedServices && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Nombre</p>
                    <p className="font-medium">{namedServiceName || 'Sin nombre'}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Cajero</p>
                  <p className="font-medium">{sellerDisplayName}</p>
                </div>
              </div>
            </div>

            {/* Productos */}
            {displayProducts.length > 0 && (
              <div className="space-y-2 mt-6">
                <h3 className="font-medium">Productos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Cantidad</th>
                        <th className="text-right p-2">Precio Unit.</th>
                        <th className="text-right p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayProducts.map((item: any) => {
                        // Intentar diferentes campos para el precio
                        const price = item.unitPrice || item.price || (item.product?.price) || 0;
                        const name = item.product?.name || item.name || `Producto ${item.productId?.substring(0, 6) || 'N/A'}`;
                        const description = item.product?.description || item.description;

                        return (
                        <tr key={item.id || Math.random()} className="border-t">
                          <td className="p-2">
                            <p className="font-medium">
                              {name}
                            </p>
                            {description && (
                              <p className="text-xs text-muted-foreground">
                                {description}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">
                            S/{Number(price).toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            S/{(Number(price) * Number(item.quantity)).toFixed(2)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/25">
                        <td colSpan={3} className="p-2 text-right font-medium">Total Productos:</td>
                        <td className="p-2 text-right font-medium">
                          S/{
                            (() => {
                              const total = displayProducts.reduce((sum: number, item: any) => {
                                const itemPrice = item.unitPrice || item.price || (item.product?.price) || 0;
                                const itemTotal = Number(itemPrice) * Number(item.quantity);
                                return sum + itemTotal;
                              }, 0);
                              
                              return total.toFixed(2);
                            })()
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Servicios */}
            {displayServices.length > 0 && (
              <div className="space-y-2 mt-6">
                <h3 className="font-medium">
                  Servicios {displayProducts.length ? 'Adicionales' : ''}
                </h3>

                <div className="space-y-4">
                  {displayServices.map((service: any) => (
                      <div
                        key={service.id || Math.random()}
                        className="w-full text-left border rounded-lg p-4 transition-all duration-200 bg-muted/10 hover:bg-primary/10 hover:shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-semibold">Nota:</span> {service.description}
                              </p>
                            )}
                            <div className="mt-2">
                              {service.type && (
                                <Badge variant="outline" className="mr-2">
                                  {translateServiceType(service.type)}
                                </Badge>
                              )}
                              <Badge variant="secondary">S/{Number(service.price).toFixed(2)}</Badge>
                            </div>
                          </div>
                        </div>

                        {service.photoUrls && service.photoUrls.length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                            {service.photoUrls
                              .filter((url: string) => url && isValidUrl(url))
                              .map((url: string, index: number) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                >
                                  <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                                    <img
                                      src={url}
                                      alt={`Imagen ${index + 1}`}
                                      className="h-full w-full object-cover"
                                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                  ))}
                </div>

                <div className="border rounded-lg p-4 bg-muted/10">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Resumen de la venta</p>
                      <p
                        className={`text-xs font-medium ${
                          orderPendingAmount === 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        Pendiente: S/{orderPendingAmount.toFixed(2)}
                      </p>
                    </div>

                    {paymentEntries.length > 0 && (
                      <div className="rounded-md border border-dashed p-3 bg-white/40 dark:bg-transparent">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between text-sm font-medium"
                          onClick={() => setShowAdvanceDetails((prev) => !prev)}
                        >
                          <span>{showAdvanceDetails ? 'Ocultar adelantos' : 'Ver detalles de adelantos'}</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${showAdvanceDetails ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {showAdvanceDetails && (
                          <div className="mt-3 space-y-2 text-sm">
                            {paymentEntries.map((pm) => (
                              <div
                                key={pm.id}
                                className="flex items-start justify-between gap-3 rounded-md border bg-muted/10 p-2"
                              >
                                <div>
                                  <p className="font-medium">{pm.type || 'Método desconocido'}</p>
                                  {pm.createdAt ? (
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(pm.createdAt), 'PP p', { locale: es })}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Sin fecha registrada</p>
                                  )}
                                </div>
                                <p className="font-semibold">S/{pm.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* Resumen Total */}
            {((displayProducts.length > 0) || (displayServices.length > 0)) && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Total General</h3>
                  <p className="text-lg font-bold">
                    S/{Number(order.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Información del Cliente */}
            {hasClientsFeature && order.client && (
              <>
                <div className="border-t my-4" />
                <div className="space-y-2">
                  <h3 className="font-medium">Información del Cliente</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Nombre</p>
                      <p className="font-medium">{order.client.name}</p>
                    </div>
                    {order.client.email && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{order.client.email}</p>
                      </div>
                    )}
                    {order.client.phone && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{order.client.phone}</p>
                      </div>
                    )}
                    {order.client.address && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Dirección</p>
                        <p className="font-medium">{order.client.address}</p>
                      </div>
                    )}
                    {(order.client.dni || order.client.ruc) && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {order.client.ruc ? 'RUC' : 'DNI'}
                        </p>
                        <p className="font-medium">{order.client.ruc || order.client.dni}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
             </>
              )}
          </div>

          {/* Panel lateral de acciones - más estrecho */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border bg-muted/10 p-6 flex-shrink-0 flex flex-col gap-4">
            <div className="space-y-3">
              {!isOnlyProductsOrder && orderPendingAmount === 0 && canShowActionButtons && (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="default"
                    className="w-full h-14 text-base font-semibold bg-black text-white hover:bg-black/90"
                    onClick={handleCompleteOrder}
                    disabled={!canManageOrders || isCompletingOrder || order.status === 'CANCELLED'}
                  >
                    {isCompletingOrder ? 'Completando...' : 'Completar'}
                  </Button>
                  {!canManageOrders && (
                    <p className="text-xs text-muted-foreground">
                      No tienes permisos para completar órdenes.
                    </p>
                  )}
                </div>
              )}

              {!isOnlyProductsOrder && canShowActionButtons && (
                <Button
                  variant="default"
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={!canManageOrders || (selectedService ? selectedService.status === ServiceStatus.ANNULLATED : true)}
                  className="w-full"
                >
                  Adelantar pago
                </Button>
              )}

              {canIssuePdf && (
                <Button
                  variant="secondary"
                  onClick={() => setShowPDF(true)}
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isLoadingDetails}
                >
                  <FileText className="h-4 w-4" />
                  Ver comprobante
                </Button>
              )}

              {(isAdmin || canManageOrders) && order.status !== 'CANCELLED' && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isCanceling}
                >
                  <XCircle className="h-4 w-4" />
                  Anular orden
                </Button>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border">
              <Button
                variant="default"
                onClick={() => onOpenChange(false)}
                disabled={isCanceling}
                className="w-full bg-black text-white hover:bg-black/90"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-lg w-[90%]">
          <DialogHeader>
            <DialogTitle>Adelantar pago</DialogTitle>
            <DialogDescription>Registra un abono para esta orden.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-3 bg-muted/10">
              <p className="text-sm font-medium">Monto pendiente</p>
              <p className="text-sm text-muted-foreground">
                {isLoadingPendingPayment
                  ? 'Cargando...'
                  : `S/${Number(orderPendingAmount || 0).toFixed(2)}`}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Métodos de pago</p>
                <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
                  + Agregar
                </Button>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-7 space-y-1">
                      <Label>Método</Label>
                      <Select
                        value={pm.type}
                        onValueChange={(value) => updatePaymentMethod(pm.id, 'type', value as PaymentTypeValue)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentType.EFECTIVO}>Efectivo</SelectItem>
                          <SelectItem value={PaymentType.TARJETA}>Tarjeta</SelectItem>
                          <SelectItem value={PaymentType.TRANSFERENCIA}>Transferencia</SelectItem>
                          <SelectItem value={PaymentType.YAPE}>Yape</SelectItem>
                          <SelectItem value={PaymentType.PLIN}>Plin</SelectItem>
                          <SelectItem value={PaymentType.DATAPHONE}>Dataphone</SelectItem>
                          <SelectItem value={PaymentType.BIZUM}>Bizum</SelectItem>
                          <SelectItem value={PaymentType.OTRO}>Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={pm.amount}
                        onChange={(e) => updatePaymentMethod(pm.id, 'amount', Number(e.target.value) || 0)}
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaymentMethod(pm.id)}
                        disabled={paymentMethods.length === 1}
                      >
                        X
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-sm font-medium">S/{totalPayment.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isProcessingPayment}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleRegisterPayment}
                disabled={isProcessingPayment || isLoadingPendingPayment || totalPayment <= 0}
              >
                {isProcessingPayment ? 'Procesando...' : 'Registrar pago'}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      <Dialog open={isCompleteAfterPaymentDialogOpen} onOpenChange={setIsCompleteAfterPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md w-[90%]">
          <DialogHeader>
            <DialogTitle>¿Desea completar la orden?</DialogTitle>
            <DialogDescription>
              El pago registrado cubre el monto total pendiente. Puedes completar la orden ahora.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCompleteAfterPaymentDialogOpen(false);
                executeServicePayment(false);
              }}
              disabled={isProcessingPayment}
            >
              Solo pagar
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-black text-white hover:bg-black/90"
              onClick={() => {
                setIsCompleteAfterPaymentDialogOpen(false);
                executeServicePayment(true);
              }}
              disabled={isProcessingPayment}
            >
              Pagar y completar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para mostrar el PDF */}
      <Dialog open={showPDF} onOpenChange={setShowPDF}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-8 border-b flex flex-row items-center justify-between position-relative">
            <div>
              <DialogTitle>Comprobante de Venta {order.orderNumber ? `- ${order.orderNumber}` : ''}</DialogTitle>
              <DialogDescription>
                Visualiza y descarga el comprobante PDF de esta venta
              </DialogDescription>
            </div>
            {canIssuePdf && showPDF && orderDetails && (
              <div className="flex gap-2 absolute left-6 top-14">
                <PDFDownloadLink
                  document={
                    <ReceiptThermalPDF
                      saleData={orderDetails}
                      businessInfo={businessInfo}
                      isCompleted={order.status === 'COMPLETED'}
                    />
                  }
                  fileName={`${order.orderNumber || 'comprobante-venta'}.pdf`}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-black bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {({ blob, url, loading, error }) =>
                    loading ? (
                      'Cargando...'
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Descargar PDF
                      </>
                    )
                  }
                </PDFDownloadLink>
                <button
                  onClick={async () => {
                    if (!orderDetails) return;
                    
                    try {
                      // Crear el blob del PDF térmico
                      const blob = await pdf(
                        <ReceiptThermalPDF 
                          saleData={orderDetails}
                          businessInfo={businessInfo}
                          isCompleted={order.status === 'COMPLETED'}
                        />
                      ).toBlob();
                      
                      // Crear URL temporal
                      const url = URL.createObjectURL(blob);
                      
                      // Abrir en una nueva ventana para imprimir
                      const printWindow = window.open(url, '_blank');
                      
                      if (printWindow) {
                        printWindow.onload = () => {
                          // Esperar a que se cargue y luego mostrar diálogo de impresión
                          setTimeout(() => {
                            printWindow.print();
                            // Cerrar la ventana después de imprimir o cancelar
                            printWindow.onafterprint = () => {
                              printWindow.close();
                              URL.revokeObjectURL(url);
                            };
                          }, 500);
                        };
                      } else {
                        // Si el navegador bloquea la ventana emergente, descargar como fallback
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${order.orderNumber || 'comprobante-venta'}-termico.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.error("Ventana emergente bloqueada. El PDF se descargó en su lugar.");
                      }
                    } catch (error) {
                      console.error("Error al generar PDF para impresión:", error);
                      toast.error("Error al generar el PDF para impresión");
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-black bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Imprimir Térmico
                </button>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-0">
            {canIssuePdf && showPDF && orderDetails && (
              <PDFViewer
                width="100%"
                height="100%"
                style={{
                  border: "none",
                  backgroundColor: "white",
                }}
              >
                <ReceiptThermalPDF
                  saleData={orderDetails}
                  businessInfo={businessInfo}
                  isCompleted={order.status === 'COMPLETED'}
                />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={(paymentMethods) => handleCancelOrder(paymentMethods)}
        loading={isCanceling}
        orderInfo={cancelOrderInfo || undefined}
      />
    </Dialog>
  );
};

export default OrderDetailsDialog;
