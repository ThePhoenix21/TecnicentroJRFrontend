"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, user, hasStoreSelected, hasPermission } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password"];
  
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔄 useEffect triggered - Dependencies changed:', {
        pathname,
        isAuthenticated,
        isPublicRoute,
        loading,
        userRole: user?.role,
        hasStoreSelected
      });
      
      setIsClient(true);
      setAuthChecked(false); // Resetear verificación cuando cambian las dependencias
      
      // Esperar a que el estado de autenticación se cargue completamente
      if (loading) {
        console.log('⏳ Still loading, waiting...');
        return;
      }

      // Si no está autenticado y no está en una ruta pública, redirigir al login
      if (!isAuthenticated && !isPublicRoute) {
        console.log('No autenticado, redirigiendo al login');
        router.push("/login");
        return;
      }

      // Si está autenticado, verificar tienda seleccionada y permisos
      if (isAuthenticated) {
        if (!user) {
          console.log('Usuario no encontrado, redirigiendo al login');
          router.push("/login");
          return;
        }

        // Verificar si hay tienda seleccionada (excepto para store-selection y rutas USER)
        if (!hasStoreSelected && pathname !== '/store-selection' && user.role?.toUpperCase() !== 'USER') {
          console.log('❌ No hay tienda seleccionada, redirigiendo a store-selection');
          console.log('📍 Pathname actual:', pathname);
          console.log('🏪 hasStoreSelected:', hasStoreSelected);
          router.push("/store-selection");
          return;
        } else if (hasStoreSelected || user.role?.toUpperCase() === 'USER') {
          console.log('✅ Tienda seleccionada detectada o es usuario USER, continuando...');
        }

        const userRole = user.role?.toUpperCase() || 'USER';

        // Helper: ruta por defecto según permisos (solo para USER)
        const getDefaultUserRoute = () => {
          if (hasPermission("VIEW_DASHBOARD")) return "/dashboard";
          if (hasPermission("VIEW_ORDERS") || hasPermission("MANAGE_ORDERS")) return "/dashboard/ventas";
          if (hasPermission("VIEW_CASH") || hasPermission("MANAGE_CASH")) return "/dashboard/caja";
          if (hasPermission("VIEW_INVENTORY") || hasPermission("MANAGE_INVENTORY")) return "/dashboard/inventario";
          if (hasPermission("VIEW_PRODUCTS") || hasPermission("MANAGE_PRODUCTS")) return "/dashboard/productos";
          if (hasPermission("VIEW_CLIENTS") || hasPermission("MANAGE_CLIENTS")) return "/dashboard/clientes";
          // Fallback: dashboard genérico
          return "/dashboard";
        };

        // Rutas permitidas para usuarios USER (incluimos /dashboard como válido)
        const userRoutes = [
          "/dashboard",
          "/dashboard/caja",
          "/dashboard/ventas",
          "/dashboard/servicios",
          "/dashboard/productos",
          "/dashboard/clientes",
          "/dashboard/inventario"
        ];
        
        // Verificar si la ruta actual está permitida para el rol USER
        const isUserRoute = userRoutes.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        );

        // Si es USER e intenta acceder a una ruta no permitida (que no sea pública), redirigir a su ruta por defecto
        if (userRole === 'USER' && !isUserRoute && !isPublicRoute) {
          const target = getDefaultUserRoute();
          console.log('Usuario USER no autorizado para esta ruta, redirigiendo a ruta por defecto:', target);
          router.push(target);
          return;
        }
      }
      
      // Si llegamos aquí, la verificación de autenticación está completa
      console.log('Autenticación verificada con éxito');
      setAuthChecked(true);
    };

    checkAuth();
  }, [pathname, isAuthenticated, isPublicRoute, loading, router, user, hasStoreSelected]);

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
      <div className="flex flex-1">
        <AppSidebar />
        {/*
          En móviles: main ocupa todo el ancho.
          En md+: dejamos margen a la izquierda para el sidebar fijo.
        */}
        <main className="flex-1 p-4 md:p-6 md:ml-64 pb-14 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}