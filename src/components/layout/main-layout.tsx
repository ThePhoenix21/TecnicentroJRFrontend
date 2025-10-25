"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/auth/auth.service";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password"];
  
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    const checkAuth = async () => {
      setIsClient(true);
      
      // Esperar a que el estado de autenticación se cargue completamente
      if (loading) {
        return;
      }

      // Si no está autenticado y no está en una ruta pública, redirigir al login
      if (!isAuthenticated && !isPublicRoute) {
        console.log('No autenticado, redirigiendo al login');
        router.push("/login");
        return;
      }

      // Si está autenticado, verificar permisos del usuario
      if (isAuthenticated) {
        const user = authService.getCurrentUser();
        if (!user) {
          console.log('Usuario no encontrado en localStorage, redirigiendo al login');
          router.push("/login");
          return;
        }

        const userRole = user.role || 'USER';
        const userRoutes = ["/dashboard/ventas", "/dashboard/servicios", "/dashboard/productos", "/dashboard/clientes"];
        
        // Redirigir rol USER desde dashboard raíz a ventas
        if (userRole === 'USER' && pathname === '/dashboard') {
          console.log('Rol de usuario detectado, redirigiendo a ventas');
          router.push('/dashboard/ventas');
          return;
        }
        
        // Verificar si la ruta actual está permitida para el rol USER
        const isUserRoute = userRoutes.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        );
        
        if (userRole === 'USER' && !isUserRoute && !isPublicRoute) {
          console.log('Usuario no autorizado para esta ruta, redirigiendo a ventas');
          router.push('/dashboard/ventas');
          return;
        }
      }
      
      // Si llegamos aquí, la verificación de autenticación está completa
      console.log('Autenticación verificada con éxito');
      setAuthChecked(true);
    };

    checkAuth();
  }, [pathname, isAuthenticated, isPublicRoute, loading, router]);

  // Mostrar spinner de carga mientras se verifica la autenticación
  if (!isClient || loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Manejar rutas públicas
  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Layout principal autenticado
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex flex-1 md:pl-64">
        <AppSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}