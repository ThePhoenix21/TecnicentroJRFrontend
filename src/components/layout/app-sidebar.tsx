"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Sun,
  ShoppingCart,
  Building,
  DollarSign,
  ClipboardCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/contexts/auth-context';
import { AuthStore } from '@/contexts/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
  requiredPermissions?: string[];
  requiredTenantFeatures?: string[];
};

const getSidebarItems = (
  userRole: string,
  hasPermission?: (permission: string) => boolean,
  tenantFeatures?: string[],
  tenantFeaturesLoaded?: boolean
) => {
  const baseItems: SidebarItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["DASHBOARD"],
      requiredPermissions: [
        // Permisos antiguos
        "dashboard.view",
        // Permisos nuevos
        "VIEW_DASHBOARD",
      ],
    },
    {
      name: "Tiendas",
      href: "/dashboard/tiendas",
      icon: Building,
      roles: ["ADMIN"],
      requiredTenantFeatures: ["STORE", "STORES"],
    },
    {
      name: "Caja",
      href: "/dashboard/caja",
      icon: DollarSign,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["CASH"],
      requiredPermissions: [
        // Caja (ver y gestionar)
        "VIEW_CASH",
        "MANAGE_CASH",
      ],
    },
    {
      name: "Ventas",
      href: "/dashboard/ventas",
      icon: ShoppingCart,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["SALES", "ORDERS"],
      requiredPermissions: [
        // Ventas / Órdenes (ver y gestionar)
        "VIEW_ORDERS",
        "MANAGE_ORDERS",
      ],
    },
    {
      name: "Servicios",
      href: "/dashboard/servicios",
      icon: FileText,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["SERVICES"],
      requiredPermissions: [
        // Servicios (ver/gestionar)
        "services.read", // compatibilidad antigua
        "VIEW_SERVICES",
        "MANAGE_SERVICES",
      ],
    },
    {
      name: "Productos",
      href: "/dashboard/productos",
      icon: Package,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["PRODUCTS"],
      requiredPermissions: [
        // Productos (ver/gestionar)
        "products.read",
        "VIEW_PRODUCTS",
        "MANAGE_PRODUCTS",
      ],
    },
    {
      name: "Inventario",
      href: "/dashboard/inventario",
      icon: ClipboardCheck,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["INVENTORY"],
      requiredPermissions: [
        // Inventario (ver/gestionar)
        "inventory.read",
        "VIEW_INVENTORY",
        "MANAGE_INVENTORY",
      ],
    },
    {
      name: "Clientes",
      href: "/dashboard/clientes",
      icon: Users,
      roles: ["ADMIN", "USER"],
      requiredTenantFeatures: ["CLIENTS"],
      requiredPermissions: [
        // Clientes (ver/gestionar)
        "clients.read",
        "VIEW_CLIENTS",
        "MANAGE_CLIENTS",
      ],
    },
    {
      name: "Configuración",
      href: "/dashboard/configuracion/usuarios",
      icon: Users,
      roles: ["ADMIN"],
      requiredTenantFeatures: ["CONFIG", "SETTINGS"],
      // Acceso solo por rol ADMIN; no depende de permisos específicos
    },
  ];

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasTenantFeature = (required?: string[]) => {
    if (!tenantFeaturesLoaded) return true;
    if (!required || required.length === 0) return true;
    if (normalizedTenantFeatures.length === 0) return false;
    return required.some((f) => normalizedTenantFeatures.includes(String(f).toUpperCase()));
  };

  // Filtrado por rol + permisos
  return baseItems.filter((item) => {
    // 1) Rol
    if (!item.roles.includes(userRole)) return false;

    // 1.1) Tenant features (aplica para ADMIN y USER)
    if (!hasTenantFeature(item.requiredTenantFeatures)) return false;

    // 2) Admin ve todo lo que su rol permite
    if (userRole === 'ADMIN') return true;

    // 3) Si no se definieron permisos específicos, basta con el rol
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }

    // 4) Si no tenemos hasPermission (por seguridad), dejar pasar
    if (!hasPermission) return true;

    // 5) USER: al menos uno de los permisos requeridos debe cumplirse
    return item.requiredPermissions.some((perm) => hasPermission(perm));
  });
};

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, currentStore, hasPermission, selectStore, isAdmin, tenantFeatures, tenantFeaturesLoaded } = useAuth();
  const userRole = (user?.role || 'USER').toUpperCase();
  const sidebarItems = getSidebarItems(userRole || 'USER', hasPermission, tenantFeatures, tenantFeaturesLoaded);

  console.log('🔍 Sidebar Debug:', {
    user,
    userRole,
    sidebarItems,
    currentStore,
    storeName: currentStore?.name,
    storeId: currentStore?.id,
    tenantFeaturesLoaded,
    tenantFeatures
  });
  
  return (
    <>
      {/* Sidebar lateral solo en escritorio/tablet */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-card/95 backdrop-blur-sm border-r border-border/50 shadow-sm z-40">
        <div className="flex h-full flex-col pt-16">
        
        {/* Información de la tienda actual */}
        {currentStore && (
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tienda</p>
                {isAdmin ? (
                  <Select
                    value={currentStore.id}
                    onValueChange={(storeId) => {
                      const nextStore = user?.stores?.find((s) => s.id === storeId);
                      if (nextStore) {
                        selectStore(nextStore as AuthStore);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 px-2 text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(user?.stores || []).map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-semibold text-foreground truncate">{currentStore.name}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 relative px-2">
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg mx-2",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 flex-shrink-0 transition-transform duration-200",
                        isActive
                          ? "h-5 w-5 text-primary"
                          : "h-5 w-5 text-foreground/60 group-hover:text-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sección de configuración y tema */}
        <div className="border-t p-4 space-y-2">
          {/* Selector de tema */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
            <div className="flex items-center text-sm font-medium text-foreground/80">
              <Sun className="h-4 w-4 mr-2 text-amber-500" />
              <span>Tema</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Botón de cerrar sesión */}
          <button
            onClick={logout}
            type="button"
            className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent/50 hover:text-foreground"
          >
            <LogOut className="mr-3 h-5 w-5 text-foreground/70 group-hover:text-foreground" />
            Cerrar sesión
          </button>
        </div>
        </div>
      </aside>

      {/* Barra inferior de navegación solo en móviles */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/60 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs",
                  isActive
                    ? "text-primary"
                    : "text-foreground/80 hover:text-foreground"
                )}
                aria-label={item.name}
                title={item.name}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 mb-0.5",
                    isActive ? "text-primary" : "text-foreground/70"
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
