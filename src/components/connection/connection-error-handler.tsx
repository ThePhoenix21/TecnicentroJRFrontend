'use client';

import { useEffect } from 'react';
import { useConnectionError } from '@/contexts/connection-error-context';
import { setConnectionErrorHandler } from '@/services/api';

export function ConnectionErrorHandler() {
  const { setConnectionError } = useConnectionError();

  useEffect(() => {
    // Registrar el handler de errores de conexión en el servicio API
    setConnectionErrorHandler(setConnectionError);

    // Cleanup al desmontar
    return () => {
      setConnectionErrorHandler(() => {});
    };
  }, [setConnectionError]);

  return null;
}
