'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { useQRScanner } from '@/hooks/useQRScanner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QRScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  mode?: 'camera' | 'gun' | 'both';
  buttonLabel?: string;
  className?: string;
}

export function QRScanner({
  onScan,
  onError,
  enabled = true,
  mode = 'both',
  buttonLabel = 'Escanear QR',
  className = '',
}: QRScannerProps) {
  const [open, setOpen] = useState(false);
  const {
    isScanning,
    startCamera,
    stopCamera,
    videoRef,
    hasCamera,
    startGunListener,
    stopGunListener,
  } = useQRScanner({
    onScan: (code) => {
      onScan(code);
      setOpen(false);
    },
    onError,
    enabled,
  });

  const showCameraButton = useMemo(
    () => mode !== 'gun' && hasCamera,
    [mode, hasCamera]
  );

  useEffect(() => {
    if (mode === 'camera') return;
    if (!enabled) return;
    startGunListener();
    return () => stopGunListener();
  }, [enabled, mode, startGunListener, stopGunListener]);

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open, stopCamera]);

  useEffect(() => {
    if (open && !isScanning) {
      startCamera();
    }
  }, [open, isScanning, startCamera]);

  // Get theme-specific text color for buttons
  const getButtonTextColor = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const themeClass = Array.from(document.documentElement.classList).find(cls => cls.startsWith('theme-'));
    
    if (themeClass) {
      switch (themeClass) {
        case 'theme-light':
        case 'theme-neutral':
        case 'theme-ash':
          return isDark ? 'text-white' : 'text-primary-foreground';
        default:
          // Phoenix theme - use original behavior
          return 'text-primary-foreground';
      }
    }
    
    // Default Phoenix theme
    return 'text-primary-foreground';
  };

  const buttonTextColor = getButtonTextColor();

  return (
    <>
      {showCameraButton && (
        <Button 
          type="button" 
          onClick={() => setOpen(true)}
          className={`bg-primary hover:bg-primary/90 ${buttonTextColor} border-primary ${className}`}
        >
          <Camera className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Escanear código</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded aspect-video bg-black object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded">
              <div className="absolute left-4 right-4 h-[2px] bg-primary animate-qr-scan" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className={`bg-primary hover:bg-primary/90 ${buttonTextColor} border-primary`}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
