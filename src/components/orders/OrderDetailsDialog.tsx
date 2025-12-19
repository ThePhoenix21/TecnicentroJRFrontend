import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, XCircle, Download, Printer, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import { PDFViewer, pdf, PDFDownloadLink } from "@react-pdf/renderer";
import ReceiptThermalPDF from "@/app/dashboard/ventas/ReceiptThermalPDF";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { Order, OrderProduct } from '@/services/order.service';
import { storeProductService } from '@/services/store-product.service';
import { orderService } from '@/services/order.service';
import { SaleData } from '@/types/sale.types';
import { useAuth } from '@/contexts/auth-context';

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

  // Mantener el estado actual por defecto, asegurando que sea un valor válido
  let calculatedStatus: OrderStatus = (order.status in statusColors) 
    ? order.status as OrderStatus 
    : 'PENDING';

  // Solo aplicar la lógica de servicios si la orden tiene servicios
  if (order.services && order.services.length > 0) {
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
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ANNULLATED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
} as const;

// Función para traducir tipos de servicio al español
const translateServiceType = (type: string | undefined): string => {
  if (!type) return 'Sin tipo';

  const translations: Record<string, string> = {
    'REPAIR': 'Reparación',
    'WARRANTY': 'Garantía',
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

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, onOpenChange, order, onOrderUpdate }) => {
  const { user, currentStore } = useAuth();
  const [showPDF, setShowPDF] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [productMap, setProductMap] = useState<ProductMap>({});
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN';

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
          console.log('Detalles de la orden cargados:', details);
          setOrderDetails(details);
        } catch (error) {
          console.error('Error al cargar detalles de la orden:', error);
          toast.error('No se pudieron cargar todos los detalles de la orden');
        } finally {
          setIsLoadingDetails(false);
        }
      };
      loadDetails();
    } else {
      setOrderDetails(null);
    }
  }, [open, order?.id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setIsCanceling(true);
    try {
      // 1. Cancelar la orden (nuevo método sin credenciales)
      const updatedOrder = await orderService.cancelOrder(order.id);

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
    } catch (error) {
      console.error("Error al anular la orden:", error);
      toast.error("Error al anular la orden", {
        description: "Ocurrió un error al intentar anular la orden. Verifique sus credenciales e intente nuevamente.",
      });
    } finally {
      setIsCanceling(false);
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

  // Determinar qué datos usar para mostrar (prioridad: orderDetails > order)
  const displayProducts = orderDetails?.productos?.map((p: any) => ({
    id: p.productId || p.id, // Ajustar según respuesta real
    productId: p.productId || p.id,
    quantity: p.cantidad || p.quantity,
    unitPrice: p.precioUnitario || p.price,
    // Mapear otros campos necesarios
    product: {
      name: p.nombre || p.name,
      description: p.descripcion || p.description
    }
  })) || order.orderProducts || [];

  const displayServices = orderDetails?.servicios?.map((s: any) => ({
    id: s.id,
    name: s.nombre || s.name,
    description: s.descripcion || s.description, // Aquí viene la nota del servicio
    price: s.precio || s.price,
    type: s.type,
    status: s.status,
    photoUrls: s.photoUrls
  })) || order.services || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[90%] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 border-b border-border flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="text-lg sm:text-xl font-semibold">Detalles de la Venta</DialogTitle>
            <Badge className={statusColors[calculateOrderStatus(order)]}>
              {translateServiceType(calculateOrderStatus(order))}
            </Badge>
          </div>
        </div>
        
        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  <p className="text-muted-foreground">ID de la Orden</p>
                  <p className="font-medium">{order.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">S/{(order.totalAmount || 0).toFixed(2)}</p>
                </div>
                {order.client && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{order.client.name}</p>
                  </div>
                )}
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
                    <div key={service.id || Math.random()} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {/* Mostrar la descripción del servicio (notas) */}
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
                            <Badge variant="secondary">
                              S/{Number(service.price).toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        {service.status && (
                            <Badge className={statusColors[service.status as keyof typeof statusColors] || statusColors.PENDING}>
                            {translateServiceType(service.status)}
                            </Badge>
                        )}
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
                {displayServices.some((s: any) => s.price > 0) && (
                  <div className="text-right font-medium">
                    <p>Total Servicios: S/
                      {displayServices
                        .reduce((sum: number, service: any) => sum + Number(service.price), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resumen Total */}
            {((displayProducts.length > 0) || (displayServices.length > 0)) && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Total General</h3>
                  <p className="text-lg font-bold">
                    S/{(order.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Información del Cliente */}
            {order.client && (
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
        
        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-between flex-shrink-0 gap-2">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => setShowPDF(true)}
              className="flex items-center gap-2"
              disabled={isLoadingDetails} // Deshabilitar si aún está cargando
            >
              <FileText className="h-4 w-4" />
              Ver Comprobante
            </Button>
            {isAdmin && order.status !== 'CANCELLED' && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center gap-2"
                disabled={isCanceling}
              >
                <XCircle className="h-4 w-4" />
                Anular Orden
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCanceling}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>

      {/* Dialog para mostrar el PDF */}
      <Dialog open={showPDF} onOpenChange={setShowPDF}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-8 border-b flex flex-row items-center justify-between position-relative">
            <div>
              <DialogTitle>Comprobante de Venta {order?.orderNumber ? `- ${order.orderNumber}` : ''}</DialogTitle>
              <DialogDescription>
                Visualiza y descarga el comprobante PDF de esta venta
              </DialogDescription>
            </div>
            {showPDF && orderDetails && (
              <div className="flex gap-2 absolute left-6 top-14">
                <PDFDownloadLink
                  document={
                    <ReceiptThermalPDF
                      saleData={orderDetails}
                      businessInfo={businessInfo}
                      isCompleted={order?.status === 'COMPLETED'}
                    />
                  }
                  fileName={`${order?.orderNumber || 'comprobante-venta'}.pdf`}
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
                          isCompleted={order?.status === 'COMPLETED'}
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
                        a.download = `${order?.orderNumber || 'comprobante-venta'}-termico.pdf`;
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
            {showPDF && orderDetails && (
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
                  isCompleted={order?.status === 'COMPLETED'}
                />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelOrder}
        loading={isCanceling}
      />
    </Dialog>
  );
};

export default OrderDetailsDialog;
