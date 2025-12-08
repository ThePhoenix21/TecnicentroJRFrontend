'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Store, ArrowRight, LogOut } from 'lucide-react';

export default function StoreSelectionPage() {
  const { user, selectStore, logout, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [isCheckingStores, setIsCheckingStores] = useState(true);

  // Verificar rol y manejar redirecciones automáticas
  useEffect(() => {
    // Si está cargando la autenticación, no hacer nada
    if (loading) return;

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated || !user) {
      console.log('No autenticado o sin usuario, redirigiendo al login');
      router.push('/login');
      return;
    }

    console.log('Usuario en store-selection:', user);
    console.log('Rol:', user.role);
    console.log('Tiendas:', user.stores);

    if (user.role?.toLowerCase() !== 'admin') {
      // Si es USER, redirigir a la primera sección permitida por sus permisos
      const perms = user.permissions || [];
      const has = (p: string) => perms.includes(p);

      let target = '/dashboard';
      if (has('VIEW_DASHBOARD')) {
        target = '/dashboard';
      } else if (has('VIEW_ORDERS') || has('MANAGE_ORDERS')) {
        target = '/dashboard/ventas';
      } else if (has('VIEW_CASH') || has('MANAGE_CASH')) {
        target = '/dashboard/caja';
      } else if (has('VIEW_INVENTORY') || has('MANAGE_INVENTORY')) {
        target = '/dashboard/inventario';
      } else if (has('VIEW_PRODUCTS') || has('MANAGE_PRODUCTS')) {
        target = '/dashboard/productos';
      } else if (has('VIEW_CLIENTS') || has('MANAGE_CLIENTS')) {
        target = '/dashboard/clientes';
      }

      console.log('No es admin, redirigiendo a ruta por defecto de USER:', target);
      router.push(target);
      return;
    }

    // Si ADMIN tiene una sola tienda, seleccionarla automáticamente
    if (user.stores && user.stores.length === 1) {
      console.log('Admin tiene una sola tienda, seleccionando automáticamente');
      selectStore(user.stores[0]);
      router.push('/dashboard');
      return;
    }

    // Si ADMIN no tiene tiendas, mostrar error
    if (!user.stores || user.stores.length === 0) {
      console.error('Admin sin tiendas asignadas');
      router.push('/login');
      return;
    }

    // Si llegamos aquí, es un ADMIN con múltiples tiendas
    setIsCheckingStores(false);
  }, [user, router, selectStore, loading, isAuthenticated]);

  // Si está cargando la autenticación o verificando tiendas, mostrar loading
  if (loading || isCheckingStores) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Verificando autenticación...' : 'Cargando tiendas...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar loading mientras redirige
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  const handleStoreSelect = async (store: { id: string; name: string }) => {
    setIsLoading(true);
    try {
      console.log('🏪 Store seleccionada antes de selectStore:', store);
      selectStore(store);
      console.log('✅ Store seleccionada después de selectStore');
      console.log('📍 Redirigiendo al dashboard...');
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Error al seleccionar tienda:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Si está cargando o no hay datos
  if (!user || !user.stores) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Tecnicentro Jr
              </span>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Selecciona una tienda
          </h1>
          <p className="text-lg text-gray-600">
            Bienvenido, {user.name}. Por favor, selecciona la tienda en la que deseas trabajar.
          </p>
        </div>

        {/* Store Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.stores.map((store) => (
            <Card 
              key={store.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50"
              onClick={() => handleStoreSelect(store)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{store.name}</CardTitle>
                <CardDescription>
                  Tienda #{store.id.slice(-8)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full" 
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStoreSelect(store);
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Seleccionando...
                    </div>
                  ) : (
                    <>
                      Seleccionar tienda
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Building className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                ¿Por qué necesitas seleccionar una tienda?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Como administrador, puedes acceder a múltiples tiendas. 
                  Seleccionar una tienda te permitirá ver y gestionar los datos específicos de esa ubicación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
