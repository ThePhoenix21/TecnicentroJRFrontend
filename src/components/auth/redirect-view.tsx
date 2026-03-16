import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Home, Users, Package, Settings, ShoppingCart, Wrench, FileText, Truck, Store, DollarSign, BarChart3 } from 'lucide-react';

interface RedirectSection {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  permission: string;
}

export const RedirectView: React.FC = () => {
  const router = useRouter();
  const { hasPermission, user } = useAuth();

  // Debug para ver qué permisos tiene realmente el usuario
  console.log('DEBUG - Usuario actual:', user);
  console.log('DEBUG - Permisos del usuario:', user?.permissions);

  const availableSections: RedirectSection[] = [
    {
      title: 'Panel de Control',
      description: 'Ver resumen y estadísticas',
      path: '/dashboard',
      icon: <Home className="h-5 w-5" />,
      permission: 'VIEW_DASHBOARD'
    },
    {
      title: 'Empleados',
      description: 'Gestionar personal y asignaciones',
      path: '/dashboard/empleados',
      icon: <Users className="h-5 w-5" />,
      permission: 'VIEW_EMPLOYEES'
    },
    {
      title: 'Productos',
      description: 'Catálogo y gestión de productos',
      path: '/dashboard/productos',
      icon: <Package className="h-5 w-5" />,
      permission: 'VIEW_PRODUCTS'
    },
    {
      title: 'Servicios',
      description: 'Gestión de servicios',
      path: '/dashboard/servicios',
      icon: <Wrench className="h-5 w-5" />,
      permission: 'VIEW_SERVICES'
    },
    {
      title: 'Ventas',
      description: 'Gestión de ventas y facturación',
      path: '/dashboard/ventas',
      icon: <ShoppingCart className="h-5 w-5" />,
      permission: 'VIEW_SALES'
    },
    {
      title: 'Clientes',
      description: 'Gestión de clientes',
      path: '/dashboard/clientes',
      icon: <Users className="h-5 w-5" />,
      permission: 'VIEW_CUSTOMERS'
    },
    {
      title: 'Proveedores',
      description: 'Gestión de proveedores',
      path: '/dashboard/proveedores',
      icon: <Truck className="h-5 w-5" />,
      permission: 'VIEW_SUPPLIERS'
    },
    {
      title: 'Inventario',
      description: 'Control de stock y almacenes',
      path: '/dashboard/inventario',
      icon: <Package className="h-5 w-5" />,
      permission: 'VIEW_INVENTORY'
    },
    {
      title: 'Tiendas',
      description: 'Gestión de tiendas',
      path: '/dashboard/tiendas',
      icon: <Store className="h-5 w-5" />,
      permission: 'VIEW_STORES'
    },
    {
      title: 'Caja',
      description: 'Control de caja y movimientos',
      path: '/dashboard/caja',
      icon: <DollarSign className="h-5 w-5" />,
      permission: 'VIEW_CASH'
    },
    {
      title: 'Reportes',
      description: 'Reportes y análisis',
      path: '/dashboard/reportes',
      icon: <FileText className="h-5 w-5" />,
      permission: 'VIEW_REPORTS'
    },
    {
      title: 'Configuración',
      description: 'Gestión de usuarios y configuración',
      path: '/dashboard/configuracion/usuarios',
      icon: <Settings className="h-5 w-5" />,
      permission: 'VIEW_USERS'
    }
  ];

  const accessibleSections = availableSections.filter(section => hasPermission(section.permission));

  // Debug para ver qué permisos tiene el usuario y qué secciones son accesibles
  console.log('DEBUG - Permisos disponibles:');
  availableSections.forEach(section => {
    console.log(`- ${section.title}: ${section.permission} -> ${hasPermission(section.permission) ? '✅' : '❌'}`);
  });
  console.log('DEBUG - Secciones accesibles:', accessibleSections.map(s => s.title));

  // Redirigir inmediatamente si hay secciones accesibles
  useEffect(() => {
    if (accessibleSections.length > 0) {
      console.log('DEBUG - Redirigiendo a:', accessibleSections[0].path);
      router.push(accessibleSections[0].path);
    }
  }, [hasPermission, accessibleSections.length, router]);

  // Si hay secciones accesibles, no mostrar nada mientras redirige
  if (accessibleSections.length > 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sin Acceso</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            No tienes permisos para acceder a ninguna sección del sistema.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacta a tu administrador para que te asigne los permisos necesarios.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
