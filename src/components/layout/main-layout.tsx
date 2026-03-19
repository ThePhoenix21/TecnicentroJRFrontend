"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";
import { getFirstAccessibleRouteFromPermissions } from "@/lib/permission-routes";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";

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
  const { isAuthenticated, loading, user, activeLoginMode, hasStoreSelected, hasWarehouseSelected, hasPermission, tenantFeaturesLoaded } = useAuth();
  const { hasFeature } = useTenantFeatures();

  const publicRoutes = ["/login", "/register", "/forgot-password"];
  
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    const checkAuth = async () => {
      
      setIsClient(true);
      setAuthChecked(false); // Resetear verificación cuando cambian las dependencias

      try {
        // Rutas públicas nunca deben quedar bloqueadas por loading/authChecked.
        // En particular, si el AuthProvider está cargando, este layout no debe mostrar spinner
        // encima del login.
        if (isPublicRoute) {
          return;
        }
        
        // Esperar a que el estado de autenticación se cargue completamente
        if (loading) {
          return;
        }

        // Si no está autenticado y no está en una ruta pública, redirigir al login
        if (!isAuthenticated && !isPublicRoute) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return;
        }

        // Si está autenticado, verificar tienda seleccionada y permisos
        if (isAuthenticated) {
          if (!user) {
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return;
          }

          // Esperar a que carguen los features del tenant antes de decidir navegación
          if (!tenantFeaturesLoaded) {
            return;
          }

          if (!activeLoginMode && pathname !== '/select-initial-context') {
            if (typeof window !== "undefined") {
              window.location.href = '/select-initial-context';
            }
            return;
          }

          if (activeLoginMode === 'STORE' && !hasStoreSelected && pathname !== '/select-initial-context') {
            if (typeof window !== "undefined") {
              window.location.href = '/select-initial-context';
            }
            return;
          }

          if (activeLoginMode === 'WAREHOUSE' && !hasWarehouseSelected && pathname !== '/select-initial-context') {
            if (typeof window !== "undefined") {
              window.location.href = '/select-initial-context';
            }
            return;
          }

          const isContextSetupRoute =
            pathname === '/select-initial-context' ||
            pathname.startsWith('/select-initial-context/');

          if (isContextSetupRoute) {
            return;
          }

          const userRole = user.role?.toUpperCase() || 'USER';

          const hasAnyTenantFeature = (required?: string[]) => {
            if (!required || required.length === 0) return true;
            return required.some((f) => hasFeature(f));
          };

          const hasAllTenantFeatures = (required?: string[]) => {
            if (!required || required.length === 0) return true;
            return required.every((f) => hasFeature(f));
          };

          type RouteFeatureRequirement = {
            prefix: string;
            requiredTenantFeaturesAny?: string[];
            requiredTenantFeaturesAll?: string[];
          };

          const routeFeatureRequirements: RouteFeatureRequirement[] = [
            { prefix: '/dashboard/tiendas', requiredTenantFeaturesAny: ['STORE', 'STORES'] },
            { prefix: '/dashboard/caja', requiredTenantFeaturesAny: ['CASH'] },
            { prefix: '/dashboard/ventas', requiredTenantFeaturesAny: ['SALES'] },
            { prefix: '/dashboard/servicios', requiredTenantFeaturesAny: ['SERVICES'] },
            { prefix: '/dashboard/productos', requiredTenantFeaturesAny: ['PRODUCTS'] },
            { prefix: '/dashboard/inventario', requiredTenantFeaturesAny: ['INVENTORY'] },
            { prefix: '/dashboard/movimientos-stock', requiredTenantFeaturesAny: ['STOCKTRANSFER'] },
            { prefix: '/dashboard/support', requiredTenantFeaturesAny: ['SUPPORT'] },
            { prefix: '/dashboard/warehouses', requiredTenantFeaturesAny: ['WAREHOUSES'] },
            { prefix: '/dashboard/empleados', requiredTenantFeaturesAny: ['EMPLOYEES'] },
            { prefix: '/dashboard/proveedores', requiredTenantFeaturesAny: ['SUPPLIERS'] },
            { prefix: '/dashboard/ordenes-suministro', requiredTenantFeaturesAny: ['SUPPLY_ORDERS'] },
            { prefix: '/dashboard/clientes', requiredTenantFeaturesAny: ['CLIENTS'] },
            { prefix: '/dashboard/configuracion/usuarios', requiredTenantFeaturesAny: ['USERS'], requiredTenantFeaturesAll: ['CONFIG'] },
            { prefix: '/dashboard/configuracion', requiredTenantFeaturesAny: ['CONFIG'] },
            { prefix: '/dashboard', requiredTenantFeaturesAny: ['DASHBOARD'] },
          ];

          const isRouteAllowedByTenant = (path: string) => {
            // store-selection / login etc no dependen de features
            if (
              path === '/store-selection' ||
              path.startsWith('/store-selection/') ||
              path === '/select-initial-context' ||
              path.startsWith('/select-initial-context/')
            ) return true;
            const rule = routeFeatureRequirements.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
            if (!rule) return true;
            return hasAnyTenantFeature(rule.requiredTenantFeaturesAny) && hasAllTenantFeatures(rule.requiredTenantFeaturesAll);
          };

          const warehousePreferredRoutes = [
            '/dashboard/productos',
            '/dashboard/inventario',
            '/dashboard/support',
            '/dashboard/empleados',
            '/dashboard/proveedores',
            '/dashboard/ordenes-suministro',
            '/dashboard/configuracion/usuarios',
          ];

          const warehouseModeAllowedPrefixes = [...warehousePreferredRoutes];

          const isRouteAllowedByLoginMode = (path: string) => {
            if (!activeLoginMode) return path === '/select-initial-context';
            if (activeLoginMode === 'STORE') return true;
            return warehouseModeAllowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
          };

          // Helper: ruta por defecto según permisos (solo para USER)
          const getDefaultUserRoute = () => {
            const routeFromPermissions = getFirstAccessibleRouteFromPermissions(user?.permissions, {
              isRouteAllowed: isRouteAllowedByTenant,
            });
            if (routeFromPermissions) {
              return routeFromPermissions;
            }

            if (activeLoginMode === 'WAREHOUSE') {
              const allowed = warehousePreferredRoutes.find((route) => isRouteAllowedByTenant(route));
              return allowed || '/dashboard/productos';
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
            const candidates = activeLoginMode === 'WAREHOUSE'
              ? warehousePreferredRoutes
              : [
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
            return match || (activeLoginMode === 'WAREHOUSE' ? '/dashboard/productos' : '/dashboard');
          };

          // Rutas permitidas para usuarios USER (incluimos /dashboard como válido)
          const userRoutes = activeLoginMode === 'WAREHOUSE'
            ? warehousePreferredRoutes
            : [
                "/dashboard",
                "/dashboard/caja",
                "/dashboard/ventas",
                "/dashboard/servicios",
                "/dashboard/productos",
                "/dashboard/clientes",
                "/dashboard/inventario",
                "/dashboard/support",
                "/dashboard/empleados",
                "/dashboard/proveedores",
                "/dashboard/ordenes-suministro",
                "/dashboard/configuracion/usuarios"
              ];
          
          // Verificar si la ruta actual está permitida para el rol USER
          const isUserRoute = userRoutes.some(route => 
            pathname === route || pathname.startsWith(`${route}/`)
          );

          // Si es USER e intenta acceder a una ruta no permitida (que no sea pública), redirigir a su ruta por defecto
          if (userRole === 'USER' && !isUserRoute && !isPublicRoute) {
            const target = getDefaultUserRoute();
            Promise.resolve(router.push(target)).catch(() => {
              if (typeof window !== "undefined") {
                window.location.href = target;
              }
            });
            return;
          }

          // Guard adicional: si la ruta está bloqueada por features del tenant, redirigir
          if (!isPublicRoute && !isRouteAllowedByTenant(pathname)) {
            const target = userRole === 'ADMIN' ? getDefaultAdminRoute() : getDefaultUserRoute();
            Promise.resolve(router.push(target)).catch(() => {
              if (typeof window !== "undefined") {
                window.location.href = target;
              }
            });
            return;
          }

          if (!isPublicRoute && !isRouteAllowedByLoginMode(pathname)) {
            const target = activeLoginMode === 'WAREHOUSE'
              ? getDefaultAdminRoute()
              : (userRole === 'ADMIN' ? '/dashboard' : getDefaultUserRoute());
            Promise.resolve(router.push(target)).catch(() => {
              if (typeof window !== "undefined") {
                window.location.href = target;
              }
            });
            return;
          }
        } // Cerrar correctamente el bloque if (isAuthenticated)
      } finally {
        setAuthChecked(true);
      }
    };

    Promise.resolve(checkAuth()).catch((error) => {
      console.error('Error al verificar autenticación en MainLayout:', error);
      setAuthChecked(true);
    });
  }, [pathname, isAuthenticated, isPublicRoute, loading, router, user, activeLoginMode, hasStoreSelected, hasWarehouseSelected, tenantFeaturesLoaded, hasFeature, hasPermission]);

  // Manejar rutas públicas (login, etc) sin depender de authChecked/loading.
  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Mostrar spinner de carga mientras se verifica la autenticación
  if (!isClient || loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pathname === '/select-initial-context' || pathname.startsWith('/select-initial-context/')) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Layout principal autenticado
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 md:ml-64 pt-20 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}