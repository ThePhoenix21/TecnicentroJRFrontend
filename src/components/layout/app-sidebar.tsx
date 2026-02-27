"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Warehouse,
  LifeBuoy,
  ChevronDown,
  Check,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/usePermissions';
import { AuthStore } from '@/contexts/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  requiredPermissions?: string[];
  requiredTenantFeatures?: string[];
};

const getSidebarItems = (
  hasPermission: (permission: string) => boolean,
  tenantFeatures?: string[],
  tenantFeaturesLoaded?: boolean
) => {
  const baseItems: SidebarItem[] = [
    {
      name: "Panel de control",
      href: "/dashboard",
      icon: LayoutDashboard,
      requiredTenantFeatures: ["DASHBOARD"],
      requiredPermissions: ["VIEW_DASHBOARD"],
    },
    {
      name: "Tiendas",
      href: "/dashboard/tiendas",
      icon: Building,
      requiredTenantFeatures: ["STORE", "STORES"],
      requiredPermissions: ["VIEW_STORES"],
    },
    {
      name: "Caja",
      href: "/dashboard/caja",
      icon: DollarSign,
      requiredTenantFeatures: ["CASH"],
      requiredPermissions: ["VIEW_CASH"],
    },
    {
      name: "Ventas",
      href: "/dashboard/ventas",
      icon: ShoppingCart,
      requiredTenantFeatures: ["SALES"],
      requiredPermissions: ["VIEW_ORDERS"],
    },
    {
      name: "Servicios",
      href: "/dashboard/servicios",
      icon: FileText,
      requiredTenantFeatures: ["SERVICES"],
      requiredPermissions: ["VIEW_SERVICES", "VIEW_ALL_SERVICES"],
    },
    {
      name: "Productos",
      href: "/dashboard/productos",
      icon: Package,
      requiredTenantFeatures: ["PRODUCTS"],
      requiredPermissions: ["VIEW_PRODUCTS"],
    },
    {
      name: "Inventario",
      href: "/dashboard/inventario",
      icon: ClipboardCheck,
      requiredTenantFeatures: ["INVENTORY"],
      requiredPermissions: ["VIEW_INVENTORY"],
    },
    {
      name: "Soporte Técnico",
      href: "/dashboard/support",
      icon: LifeBuoy,
      requiredTenantFeatures: ["SUPPORT"],
      requiredPermissions: ["VIEW_SUPPORT"],
    },
    {
      name: "Almacenes",
      href: "/dashboard/warehouses",
      icon: Warehouse,
      requiredTenantFeatures: ["WAREHOUSES"],
      requiredPermissions: ["VIEW_WAREHOUSES"],
    },
    {
      name: "Clientes",
      href: "/dashboard/clientes",
      icon: Users,
      requiredTenantFeatures: ["CLIENTS"],
      requiredPermissions: ["VIEW_CLIENTS"],
    },
    {
      name: "Empleados",
      href: "/dashboard/empleados",
      icon: Users,
      requiredTenantFeatures: ["EMPLOYEES"],
      requiredPermissions: ["VIEW_EMPLOYEES"],
    },
    {
      name: "Proveedores",
      href: "/dashboard/proveedores",
      icon: Users,
      requiredTenantFeatures: ["SUPPLIERS"],
      requiredPermissions: ["VIEW_SUPPLIERS"],
    },
    {
      name: "Órdenes de suministro",
      href: "/dashboard/ordenes-suministro",
      icon: ClipboardCheck,
      requiredTenantFeatures: ["SUPPLY_ORDERS"],
      requiredPermissions: ["VIEW_SUPPLY_ORDERS"],
    },
    {
      name: "Usuarios",
      href: "/dashboard/configuracion/usuarios",
      icon: Users,
      requiredTenantFeatures: ["USERS"],
      requiredPermissions: ["VIEW_USERS"],
    },
  ];

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasTenantFeature = (required?: string[]) => {
    if (!tenantFeaturesLoaded) return true;
    if (!required || required.length === 0) return true;
    if (normalizedTenantFeatures.length === 0) return false;
    return required.some((f) => normalizedTenantFeatures.includes(String(f).toUpperCase()));
  };

  // Filtrado solo por permisos y tenant features
  return baseItems.filter((item) => {
    // 1) Tenant features
    if (!hasTenantFeature(item.requiredTenantFeatures)) return false;

    // 2) Si no se definieron permisos específicos, mostrar el item
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }

    // 3) Verificar permisos: al menos uno de los permisos requeridos debe cumplirse
    return item.requiredPermissions.some((perm) => hasPermission(perm));
  });
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, currentStore, hasPermission, selectStore, tenantFeatures, tenantFeaturesLoaded } = useAuth();
  const { hasPermission: hasPermissionHook, canManageUsers } = usePermissions();
  const sidebarItems = getSidebarItems(hasPermissionHook, tenantFeatures, tenantFeaturesLoaded);

  const canSelectStore = (user?.stores?.length || 0) > 1;
  
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
                {canSelectStore ? (
                  <Select
                    value={currentStore.id}
                    onValueChange={(storeId) => {
                      const nextStore = user?.stores?.find((s) => s.id === storeId);
                      if (nextStore) {
                        selectStore(nextStore as AuthStore);
                        router.refresh();
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

      {/* Barra superior de navegación solo en móviles */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 border-b border-border/60 backdrop-blur-sm">
        <div className="flex items-center h-14">
          {/* Primera mitad: Selector de tienda */}
          {currentStore && (
            <div className="flex-1 px-3 py-2 border-r border-border/40">
              <div className="flex items-center gap-2 w-full">
                <Building className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {canSelectStore ? (
                    <Select
                      value={currentStore.id}
                      onValueChange={(storeId) => {
                        const nextStore = user?.stores?.find((s) => s.id === storeId);
                        if (nextStore) {
                          selectStore(nextStore as AuthStore);
                          router.refresh();
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 px-2 text-xs font-semibold w-full border-0 bg-transparent hover:bg-accent/50 focus:ring-0">
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
                    <p className="text-xs font-semibold text-foreground truncate">{currentStore.name}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Segunda mitad: Lista desplegable de secciones */}
          <div className="flex-1 px-3 py-2 border-l border-border/40 border-r border-border/40">
            <div className="flex items-center gap-2">
              <Menu className="h-4 w-4 text-primary flex-shrink-0" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex-1 h-7 px-2 justify-between text-xs font-medium border-0 bg-transparent hover:bg-accent/50"
                  >
                    {sidebarItems.find(item => pathname === item.href)?.name || "Secciones"}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 max-h-80 overflow-y-auto"
                side="bottom"
              >
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      asChild
                      className={cn(
                        "cursor-pointer",
                        isActive && "bg-accent"
                      )}
                    >
                      <Link href={item.href} className="flex items-center w-full">
                        <Icon className="mr-3 h-4 w-4" />
                        <span className="flex-1">{item.name}</span>
                        {isActive && <Check className="ml-2 h-3 w-3" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Espaciador para el contenido en móviles */}
      <div className="md:hidden h-14"></div>
    </>
  );
}
