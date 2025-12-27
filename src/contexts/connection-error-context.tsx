'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ConnectionErrorContextType {
  hasConnectionError: boolean;
  setConnectionError: (hasError: boolean) => void;
  retryConnection: () => void;
}

const ConnectionErrorContext = createContext<ConnectionErrorContextType | undefined>(undefined);

export function ConnectionErrorProvider({ children }: { children: ReactNode }) {
  const [hasConnectionError, setHasConnectionError] = useState(false);

  const retryConnection = () => {
    setHasConnectionError(false);
  };

  const value: ConnectionErrorContextType = {
    hasConnectionError,
    setConnectionError: setHasConnectionError,
    retryConnection
  };

  return (
    <ConnectionErrorContext.Provider value={value}>
      {children}
    </ConnectionErrorContext.Provider>
  );
}

export const useConnectionError = (): ConnectionErrorContextType => {
  const context = useContext(ConnectionErrorContext);
  if (context === undefined) {
    throw new Error('useConnectionError debe usarse dentro de un ConnectionErrorProvider');
  }
  return context;
};
