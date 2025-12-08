'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { checkMaintenanceStatus } from '@/services/maintenance.service';
import { useRouter } from 'next/navigation';

interface MaintenanceContextType {
  isInMaintenance: boolean;
  isLoading: boolean;
  error: Error | null;
  checkStatus: () => Promise<{ isInMaintenance: boolean; error?: Error }>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { isInMaintenance: maintenanceStatus, error: statusError } = await checkMaintenanceStatus();
      
      // Actualizar el estado de mantenimiento
      setIsInMaintenance(maintenanceStatus);
      
      // Si hay un error, lo guardamos pero no bloqueamos la aplicación
      if (statusError) {
        setError(statusError);
        console.warn('Error checking maintenance status (non-blocking):', statusError);
      }
      
      return { isInMaintenance: maintenanceStatus, error: statusError };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error checking maintenance status');
      console.error('Error in maintenance check:', error);
      setError(error);
      return { isInMaintenance: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar el estado de mantenimiento al montar el componente
  useEffect(() => {
    checkStatus();
  }, []);

  // Verificar el estado periódicamente (cada minuto)
  useEffect(() => {
    const interval = setInterval(checkStatus, 60 * 1000); // 1 minuto
    return () => clearInterval(interval);
  }, []);

  // Redirigir a la página de mantenimiento si es necesario
  useEffect(() => {
    if (isInMaintenance && !window.location.pathname.startsWith('/maintenance')) {
      router.push('/maintenance');
    }
  }, [isInMaintenance, router]);

  return (
    <MaintenanceContext.Provider value={{ 
      isInMaintenance, 
      isLoading, 
      error, 
      checkStatus 
    }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export const useMaintenance = (): MaintenanceContextType => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance debe usarse dentro de un MaintenanceProvider');
  }
  return context;
};
