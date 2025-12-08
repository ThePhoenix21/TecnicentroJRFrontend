'use client';

import { useMaintenance } from '@/contexts/maintenance-context';
import { useEffect, useState } from 'react';

export default function MaintenanceMode() {
  const { isInMaintenance, isLoading, error, checkStatus } = useMaintenance();
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Update last checked time when maintenance status is checked
  useEffect(() => {
    if (!isLoading) {
      setLastChecked(new Date());
    }
  }, [isLoading]);

  // Show maintenance screen with a small delay to prevent flashing
  useEffect(() => {
    if (isInMaintenance) {
      const timer = setTimeout(() => setShowMaintenance(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowMaintenance(false);
    }
  }, [isInMaintenance]);

  if (!showMaintenance || error) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Sitio en Mantenimiento</h1>
          <p className="text-muted-foreground">
            Estamos realizando tareas de mantenimiento para mejorar nuestro servicio. Por favor, inténtelo de nuevo más tarde.
          </p>
        </div>
        
        <div className="space-y-4 pt-4 text-sm text-muted-foreground border-t border-border">
          <p className="text-sm">
            <span className="font-medium">Última verificación:</span> {lastChecked?.toLocaleTimeString()}
          </p>
          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={isLoading ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="m16 16 5 5h-5" />
            </svg>
            {isLoading ? 'Verificando...' : 'Reintentar'}
          </button>
        </div>
      </div>
    </div>
  );
}
