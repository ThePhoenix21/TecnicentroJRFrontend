'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ServiceStatus, ServiceType, ServiceDetail, serviceService } from '@/services/service.service';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ImageOff, ZoomIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceDetailsModalProps {
  serviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

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

export default function ServiceDetailsModal({ serviceId, isOpen, onClose }: ServiceDetailsModalProps) {
  const { tenantFeatures, tenantFeaturesLoaded } = useAuth();
  const [currentService, setCurrentService] = useState<ServiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasImageUpload = !tenantFeaturesLoaded || normalizedTenantFeatures.includes('IMAGEUPLOAD');

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
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
              <Badge variant={currentService?.service?.status === ServiceStatus.PAID ? 'default' : 'secondary'}>
                {currentService?.service?.status === ServiceStatus.PAID ? 'Pagado' : 'Pago pendiente'}
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
                  <div className="space-y-4 rounded-xl border bg-background/70 p-4">
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
                  <div className="space-y-4 rounded-xl border bg-background/70 p-4">
                    <div className="p-4 rounded-lg border bg-muted/20">
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
                    
                    <div className="p-4 rounded-lg border bg-muted/10">
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
                
                {/* Imágenes */}
                {hasImageUpload && currentService?.service.photoUrls && currentService.service.photoUrls.length > 0 && (
                  <div className="rounded-xl border bg-background/70 p-4">
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">Imágenes del Servicio</Label>
                    {renderImageGallery()}
                  </div>
                )}
                
                {/* Información Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <Label className="text-sm font-medium text-muted-foreground">Categoría</Label>
                    <p className="font-medium">{currentService?.serviceCategory?.name || 'Sin categoría'}</p>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <Label className="text-sm font-medium text-muted-foreground">Tienda</Label>
                    <p className="font-medium">{currentService?.order.storeName || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg border">
                    <Label className="text-sm font-medium text-muted-foreground">Fecha del Servicio</Label>
                    <p className="font-medium">{currentService?.service?.createdAt ? format(new Date(currentService.service.createdAt), 'PPP', { locale: es }) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cerrar
            </Button>
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
    </>
  );
}
