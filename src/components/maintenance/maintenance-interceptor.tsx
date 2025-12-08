'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMaintenance } from '@/contexts/maintenance-context';

export function MaintenanceInterceptor() {
  const { isInMaintenance, checkStatus, isLoading } = useMaintenance();
  const pathname = usePathname();
  const router = useRouter();

  // Verificar el estado de mantenimiento en cada cambio de ruta
  useEffect(() => {
    // No hacer nada si estamos en la página de mantenimiento
    if (pathname === '/maintenance') {
      return;
    }

    const verifyMaintenance = async () => {
      const { isInMaintenance: maintenanceStatus } = await checkStatus();
      
      if (maintenanceStatus) {
        // Redirigir a la página de mantenimiento si no estamos ya en ella
        router.replace('/maintenance');
      }
    };

    // Solo verificar si no está cargando y no estamos ya en mantenimiento
    if (!isLoading && !isInMaintenance) {
      verifyMaintenance();
    }
  }, [pathname, isInMaintenance, isLoading, checkStatus, router]);

  // Redirigir a la página de inicio si el mantenimiento termina
  useEffect(() => {
    if (!isLoading && !isInMaintenance && pathname === '/maintenance') {
      router.replace('/');
    }
  }, [isInMaintenance, isLoading, pathname, router]);

  return null;
}
