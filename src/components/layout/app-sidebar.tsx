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
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/contexts/auth-context';

const getSidebarItems = (userRole: string) => {
  const baseItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN"],
    },
    {
      name: "Ventas",
      href: "/dashboard/ventas",
      icon: ShoppingCart,
      roles: ["ADMIN", "USER"],
    },
    {
      name: "Servicios",
      href: "/dashboard/servicios",
      icon: FileText,
      roles: ["ADMIN", "USER"],
    },
    {
      name: "Productos",
      href: "/dashboard/productos",
      icon: Package,
      roles: ["ADMIN", "USER"],
    },
    {
      name: "Clientes",
      href: "/dashboard/clientes",
      icon: Users,
      roles: ["ADMIN", "USER"],
    },
    {
      name: "Configuración",
      href: "/dashboard/configuracion",
      icon: Settings,
      roles: ["ADMIN"],
    },
  ];

  return baseItems.filter(item => item.roles.includes(userRole));
};

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'USER'; // Valor por defecto 'USER' si no hay usuario
  return (
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-card/95 backdrop-blur-sm border-r border-border/50 shadow-sm">
      <div className="flex h-full flex-col pt-16">
        <div className="flex-1 overflow-y-auto py-4 relative px-2">
          <nav className="space-y-1">
            {getSidebarItems(userRole).map((item) => {
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
  );
}
