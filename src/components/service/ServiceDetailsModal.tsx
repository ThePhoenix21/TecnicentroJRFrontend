'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Service } from '@/types/service.types';
import { useState, useEffect } from 'react';
import { serviceService } from '@/services/service.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ImageOff, ZoomIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceDetailsModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

const statusOptions = [
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completado' },
];

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
    'CANCELLED': 'Cancelado',
    'PAID': 'Pagado',
  };

  return translations[type] || type.replace('_', ' ');
};

export function ServiceDetailsModal({ service, isOpen, onClose, onStatusChange }: ServiceDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(service?.status || '');
  const [currentService, setCurrentService] = useState<Service | null>(service);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  useEffect(() => {
    setCurrentService(service);
    if (service) {
      setStatus(service.status);
    }
  }, [service]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentService) return;
    
    try {
      setIsLoading(true);
      const formattedStatus = status.toUpperCase();
      
      // Update the service status and check if all services are completed
      const result = await serviceService.updateServiceStatus(currentService.id, formattedStatus);
      
      // Show appropriate notification
      if (result.allServicesCompleted && result.orderId) {
        toast.success('¡Servicio completado y orden marcada como finalizada!');
      } else if (formattedStatus === 'COMPLETED') {
        toast.success('Servicio marcado como completado');
      } else {
        toast.success('Estado del servicio actualizado correctamente');
      }
      
      // Update the UI
      onStatusChange();
      
      // Close the modal after a short delay to show the success message
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error: unknown) {
      console.error('Error updating service status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el estado del servicio';
      
      // Show more specific error messages based on the error
      if (errorMessage.includes('No se pudo actualizar el estado de la orden')) {
        toast.error('El servicio se actualizó, pero no se pudo actualizar el estado de la orden. Por favor, inténtalo de nuevo más tarde.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
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
  const validPhotoUrls = (currentService.photoUrls || []).filter(url => 
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
          {validPhotoUrls.map((url, index) => (
            <div 
              key={`${url}-${index}`} 
              className="relative aspect-square group"
            >
              <button
                className="absolute inset-0 w-full h-full"
                onClick={() => {
                  setSelectedImage(url);
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
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      setIsImageLoading(false);
                    }}
                  />
                  {isImageLoading && (
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  )}
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalles del Servicio</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="grid gap-6 py-2">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Cliente</Label>
                <div className="col-span-3">
                  <p className="font-medium">{currentService.client?.name || 'No especificado'}</p>
                  {currentService.client?.phone && (
                    <p className="text-sm text-muted-foreground">
                      Tel: {currentService.client.phone}
                    </p>
                  )}
                  {currentService.client?.email && (
                    <p className="text-sm text-muted-foreground">
                      {currentService.client.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Servicio</Label>
                <div className="col-span-3 space-y-1">
                  <p className="font-medium">{currentService.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {translateServiceType(currentService.type)}
                  </p>
                  {currentService.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentService.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Galería de imágenes */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Imágenes</Label>
                <div className="col-span-3">
                  {renderImageGallery()}
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Precio</Label>
                <div className="col-span-3">
                  <p className="font-medium">
                    {new Intl.NumberFormat('es-PE', {
                      style: 'currency',
                      currency: 'PEN'
                    }).format(currentService.price)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Fecha de creación</Label>
                <div className="col-span-3">
                  <p className="text-sm">{formatDate(currentService.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right font-medium pt-2">Estado</Label>
                <div className="col-span-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Estado actual: {translateServiceType(currentService.status)}
                  </p>
                  <Select 
                    value={status} 
                    onValueChange={setStatus}
                    disabled={isLoading}
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
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cerrar
            </Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={isLoading || status === currentService.status}
            >
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
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
