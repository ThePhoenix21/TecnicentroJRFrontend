'use client';

import { createContext, useContext, ReactNode } from 'react';

interface MaintenanceContextType {
  isInMaintenance: boolean;
  isLoading: boolean;
  error: Error | null;
  checkStatus: () => Promise<{ isInMaintenance: boolean; error?: Error }>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  // STUB: El modo mantenimiento ahora se maneja con interceptor global
  const value: MaintenanceContextType = {
    isInMaintenance: false,
    isLoading: false,
    error: null,
    checkStatus: async () => ({ isInMaintenance: false })
  };

  return (
    <MaintenanceContext.Provider value={value}>
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
