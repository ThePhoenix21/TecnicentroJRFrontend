'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Package, ShoppingCart, Users, LogOut, Settings, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const getMobileNavItems = (userRole: string) => {
  const baseItems = [
    { 
      name: 'Inicio', 
      href: '/dashboard', 
      icon: Home,
      roles: ['ADMIN']
    },
    { 
      name: 'Ventas', 
      href: '/dashboard/ventas', 
      icon: ShoppingCart,
      roles: ['ADMIN', 'USER']
    },
    { 
      name: 'Servicios', 
      href: '/dashboard/servicios', 
      icon: FileText,
      roles: ['ADMIN', 'USER']
    },
    { 
      name: 'Productos', 
      href: '/dashboard/productos', 
      icon: Package,
      roles: ['ADMIN', 'USER']
    },
    { 
      name: 'Clientes', 
      href: '/dashboard/clientes', 
      icon: Users,
      roles: ['ADMIN', 'USER']
    },
    { 
      name: 'Configuración', 
      href: '/dashboard/configuracion', 
      icon: Settings,
      roles: ['ADMIN']
    },
  ];

  return baseItems.filter(item => item.roles.includes(userRole));
};

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'USER'; // Valor por defecto 'USER' si no hay usuario
  const mobileNavItems = getMobileNavItems(userRole);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex flex-1 flex-col items-center justify-center p-3 text-xs transition-all duration-200',
                'relative overflow-hidden rounded-lg mx-1',
                isActive 
                  ? 'bg-gray-800 text-white' 
                  : 'text-foreground/60 hover:bg-muted/50 hover:text-primary'
              )}
            >
              <Icon 
                className={cn(
                  'transition-transform duration-200',
                  isActive ? 'h-7 w-7' : 'h-6 w-6 group-hover:scale-110'
                )} 
              />
              <span className={cn(
                'mt-1.5 font-medium transition-all duration-200',
                isActive ? 'text-white text-[13px] font-semibold' : 'group-hover:scale-105'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className={cn(
            'group flex flex-1 flex-col items-center justify-center p-3 text-xs transition-all duration-200',
            'relative overflow-hidden rounded-lg mx-1',
            'text-foreground/60 hover:bg-muted/50 hover:text-destructive'
          )}
        >
          <LogOut className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          <span className="mt-1.5 font-medium transition-all duration-200 group-hover:scale-105">
            Cerrar sesión
          </span>
        </button>
      </div>
    </nav>
  );
}
