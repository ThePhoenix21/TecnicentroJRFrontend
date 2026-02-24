"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";
import { getFirstAccessibleRouteFromPermissions } from "@/lib/permission-routes";

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
  const { isAuthenticated, loading, user, currentStore, hasStoreSelected, hasPermission, tenantFeatures, tenantFeaturesLoaded } = useAuth();

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
        hasStoreSelected,
        tenantFeaturesLoaded,
        tenantFeatures
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

        // Esperar a que carguen los features del tenant antes de decidir navegación
        if (!tenantFeaturesLoaded) {
          console.log('⏳ Esperando tenantFeaturesLoaded...');
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

        const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
        const hasTenantFeature = (required?: string[]) => {
          if (!tenantFeaturesLoaded) return true;
          if (!required || required.length === 0) return true;
          if (normalizedTenantFeatures.length === 0) return false;
          return required.some((f) => normalizedTenantFeatures.includes(String(f).toUpperCase()));
        };

        const routeFeatureRequirements: Array<{ prefix: string; requiredTenantFeatures: string[] }> = [
          { prefix: '/dashboard/tiendas', requiredTenantFeatures: ['STORE', 'STORES'] },
          { prefix: '/dashboard/caja', requiredTenantFeatures: ['CASH'] },
          { prefix: '/dashboard/ventas', requiredTenantFeatures: ['SALES', 'ORDERS', 'SALESOFPRODUCTS', 'SALESOFSERVICES'] },
          { prefix: '/dashboard/servicios', requiredTenantFeatures: ['SERVICES'] },
          { prefix: '/dashboard/productos', requiredTenantFeatures: ['PRODUCTS'] },
          { prefix: '/dashboard/inventario', requiredTenantFeatures: ['INVENTORY'] },
          { prefix: '/dashboard/clientes', requiredTenantFeatures: ['CLIENTS'] },
          { prefix: '/dashboard/configuracion', requiredTenantFeatures: ['CONFIG', 'SETTINGS'] },
          { prefix: '/dashboard', requiredTenantFeatures: ['DASHBOARD'] },
        ];

        const isRouteAllowedByTenant = (path: string) => {
          // store-selection / login etc no dependen de features
          if (path === '/store-selection' || path.startsWith('/store-selection/')) return true;
          const rule = routeFeatureRequirements.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
          if (!rule) return true;
          return hasTenantFeature(rule.requiredTenantFeatures);
        };

        // Helper: ruta por defecto según permisos (solo para USER)
        const getDefaultUserRoute = () => {
          const routeFromPermissions = getFirstAccessibleRouteFromPermissions(user?.permissions, {
            isRouteAllowed: isRouteAllowedByTenant,
          });
          if (routeFromPermissions) {
            return routeFromPermissions;
          }

          if ((hasPermission("VIEW_ORDERS") || hasPermission("MANAGE_ORDERS")) && isRouteAllowedByTenant('/dashboard/ventas')) return "/dashboard/ventas";
          if ((hasPermission("VIEW_CASH") || hasPermission("MANAGE_CASH")) && isRouteAllowedByTenant('/dashboard/caja')) return "/dashboard/caja";
          if ((hasPermission("VIEW_INVENTORY") || hasPermission("MANAGE_INVENTORY")) && isRouteAllowedByTenant('/dashboard/inventario')) return "/dashboard/inventario";
          if ((hasPermission("VIEW_PRODUCTS") || hasPermission("MANAGE_PRODUCTS")) && isRouteAllowedByTenant('/dashboard/productos')) return "/dashboard/productos";
          if ((hasPermission("VIEW_CLIENTS") || hasPermission("MANAGE_CLIENTS")) && isRouteAllowedByTenant('/dashboard/clientes')) return "/dashboard/clientes";
          // Fallback: dashboard genérico
          return isRouteAllowedByTenant('/dashboard') ? "/dashboard" : "/dashboard/ventas";
        };

        const getDefaultAdminRoute = () => {
          const candidates = [
            '/dashboard',
            '/dashboard/ventas',
            '/dashboard/caja',
            '/dashboard/servicios',
            '/dashboard/productos',
            '/dashboard/inventario',
            '/dashboard/clientes',
            '/dashboard/tiendas',
            '/dashboard/configuracion/usuarios',
          ];
          const match = candidates.find((r) => isRouteAllowedByTenant(r));
          return match || '/dashboard';
        };

        // Rutas permitidas para usuarios USER (incluimos /dashboard como válido)
        const userRoutes = [
          "/dashboard",
          "/dashboard/caja",
          "/dashboard/ventas",
          "/dashboard/servicios",
          "/dashboard/productos",
          "/dashboard/clientes",
          "/dashboard/inventario",
          "/dashboard/support"
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

        // Guard adicional: si la ruta está bloqueada por features del tenant, redirigir
        if (!isPublicRoute && !isRouteAllowedByTenant(pathname)) {
          const target = userRole === 'ADMIN' ? getDefaultAdminRoute() : getDefaultUserRoute();
          console.log('Ruta no permitida por tenant features, redirigiendo a:', target);
          router.push(target);
          return;
        }
      }
      
      // Si llegamos aquí, la verificación de autenticación está completa
      console.log('Autenticación verificada con éxito');
      setAuthChecked(true);
    };

    checkAuth();
  }, [pathname, isAuthenticated, isPublicRoute, loading, router, user, hasStoreSelected, tenantFeaturesLoaded, tenantFeatures, hasPermission]);

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
        <main key={currentStore?.id || 'no-store'} className="flex-1 p-4 md:p-6 md:ml-64 pb-14 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}