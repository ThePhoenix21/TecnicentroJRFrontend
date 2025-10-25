'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface Workbox {
  addEventListener: (event: string, callback: (event: Event) => void) => void;
  register: () => Promise<void>;
}

declare global {
  interface Window {
    workbox?: Workbox;
  }
}

export default function PWA() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox) {
      const wb = window.workbox;
      
      // Añadir un manejador para cuando el service worker esté listo
      wb.addEventListener('installed', (event: Event) => {
        console.log(`Event ${event.type} is triggered.`);
        console.log(event);
      });

      // Registrar el service worker después de que la página se cargue
      wb.register().catch(console.error);
    }
  }, []);

  // Este efecto se ejecutará cuando cambie la ruta
  useEffect(() => {
    // Aquí puedes añadir lógica para manejar cambios de ruta
  }, [pathname, searchParams]);

  return null;
}