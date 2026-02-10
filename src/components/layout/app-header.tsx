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
  ];

  return baseItems.filter(item => item.roles.includes(userRole));
};

export function AppHeader() {
  // La navegación móvil principal ahora vive en el AppSidebar (barra inferior).
  // Dejamos este header sin contenido para no duplicar barras ni tapar las secciones.
  return null;
}
