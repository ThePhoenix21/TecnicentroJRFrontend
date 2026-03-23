'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface UseQRScannerOptions {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

interface UseQRScannerReturn {
  // Cámara
  isScanning: boolean;
  startCamera: () => void;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasCamera: boolean;

  // Pistola USB
  isListeningGun: boolean;
  startGunListener: () => void;
  stopGunListener: () => void;
}

const GUN_INTERVAL_MS = 50;
const GUN_IDLE_TIMEOUT_MS = 500;
const GUN_MIN_LENGTH = 3;

export function useQRScanner(options: UseQRScannerOptions): UseQRScannerReturn {
  const { onScan, onError, enabled = true } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  const [isListeningGun, setIsListeningGun] = useState(false);
  const gunBufferRef = useRef('');
  const gunLastTimeRef = useRef<number | null>(null);
  const gunTimeoutRef = useRef<number | null>(null);

  const clearGunBuffer = useCallback(() => {
    gunBufferRef.current = '';
    gunLastTimeRef.current = null;
    if (gunTimeoutRef.current !== null) {
      window.clearTimeout(gunTimeoutRef.current);
      gunTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled || isScanning) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      onError?.('El navegador no soporta acceso a cámara.');
      return;
    }

    const reader = readerRef.current ?? new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      const devices = await reader.listVideoInputDevices();
      if (!devices.length) {
        setHasCamera(false);
        onError?.('No se encontró ninguna cámara disponible.');
        return;
      }

      const backCamera = devices.find((device) =>
        /back|rear|environment/i.test(device.label)
      );
      const deviceId = backCamera?.deviceId ?? devices[0].deviceId;

      if (!videoRef.current) {
        onError?.('No se encontró el elemento de video.');
        return;
      }

      setIsScanning(true);
      await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, error) => {
        if (result) {
          onScan(result.getText());
          stopCamera();
          return;
        }

        if (error && !(error instanceof NotFoundException)) {
          onError?.('Error al leer el código.');
        }
      });
    } catch (error) {
      stopCamera();
      const name = (error as Error)?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        onError?.('Permiso de cámara denegado.');
        return;
      }
      onError?.('No se pudo iniciar la cámara.');
    }
  }, [enabled, isScanning, onError, onScan, stopCamera]);

  const startGunListener = useCallback(() => {
    if (!enabled) return;
    setIsListeningGun(true);
  }, [enabled]);

  const stopGunListener = useCallback(() => {
    setIsListeningGun(false);
    clearGunBuffer();
  }, [clearGunBuffer]);

  useEffect(() => {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      setHasCamera(false);
      return;
    }

    let isActive = true;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (!isActive) return;
        const hasVideo = devices.some((device) => device.kind === 'videoinput');
        setHasCamera(hasVideo);
      })
      .catch(() => {
        if (!isActive) return;
        setHasCamera(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isListeningGun) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      const activeElement = document.activeElement as HTMLElement | null;
      // TEMPORAL DEBUG - borrar después
      console.log(
        'activeElement:',
        activeElement?.tagName,
        activeElement?.id,
        document.activeElement
      );
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable)
      ) {
        console.log('BLOQUEADO por activeElement:', activeElement.tagName);
        return;
      }

      console.log('PROCESANDO key:', event.key, 'buffer:', gunBufferRef.current);

      const now = Date.now();
      const lastTime = gunLastTimeRef.current;
      const delta = lastTime ? now - lastTime : null;
      gunLastTimeRef.current = now;

      if (gunTimeoutRef.current !== null) {
        window.clearTimeout(gunTimeoutRef.current);
      }
      gunTimeoutRef.current = window.setTimeout(() => {
        clearGunBuffer();
      }, GUN_IDLE_TIMEOUT_MS);

      if (event.key === 'Enter') {
        if (gunBufferRef.current.length >= GUN_MIN_LENGTH) {
          onScan(gunBufferRef.current);
        }
        clearGunBuffer();
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      if (delta === null || delta < GUN_INTERVAL_MS) {
        gunBufferRef.current += event.key;
      } else {
        clearGunBuffer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearGunBuffer();
    };
  }, [clearGunBuffer, enabled, isListeningGun, onScan]);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      stopGunListener();
    }
  }, [enabled, stopCamera, stopGunListener]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    isScanning,
    startCamera,
    stopCamera,
    videoRef,
    hasCamera,
    isListeningGun,
    startGunListener,
    stopGunListener,
  };
}
