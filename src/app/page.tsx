'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Mostrar un estado de carga mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-foreground/60">
        Cargando...
      </div>
    </div>
  );
}