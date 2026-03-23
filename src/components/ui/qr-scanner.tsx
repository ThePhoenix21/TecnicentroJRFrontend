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
}

export function QRScanner({
  onScan,
  onError,
  enabled = true,
  mode = 'both',
  buttonLabel = 'Escanear QR',
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

  return (
    <>
      {showCameraButton && (
        <Button type="button" onClick={() => setOpen(true)}>
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
              <div className="absolute left-4 right-4 h-[2px] bg-red-500 animate-qr-scan" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
