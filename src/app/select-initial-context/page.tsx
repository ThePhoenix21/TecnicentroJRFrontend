'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenantFeatures } from '@/hooks/useTenantFeatures';
import { Button } from '@/components/ui/button';
import { Building2, Warehouse, LogOut, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type InitialContextMode = 'STORE' | 'WAREHOUSE';

export default function SelectInitialContextPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, activeLoginMode, hasStoreSelected, hasWarehouseSelected, selectStore, selectWarehouse, logout } = useAuth();
  const { hasWarehouse: hasWarehouseFeature } = useTenantFeatures();
  const [mode, setMode] = useState<InitialContextMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const stores = useMemo(() => user?.stores || [], [user?.stores]);
  const warehouses = useMemo(() => user?.warehouses || [], [user?.warehouses]);

  const hasStores = stores.length > 0;
  const hasWarehouses = warehouses.length > 0 && hasWarehouseFeature();
  const hasBoth = hasStores && hasWarehouses;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Solo redirigir si ya existe un contexto realmente seleccionado.
    if (activeLoginMode === 'STORE' && hasStoreSelected) {
      router.replace('/dashboard');
      return;
    }

    if (activeLoginMode === 'WAREHOUSE' && hasWarehouseSelected) {
      router.replace('/dashboard');
      return;
    }

    // Si el tenant no tiene la feature WAREHOUSES pero el modo activo es WAREHOUSE, redirigir al dashboard
    if (activeLoginMode === 'WAREHOUSE' && !hasWarehouseFeature()) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, isAuthenticated, activeLoginMode, hasStoreSelected, hasWarehouseSelected, hasWarehouseFeature, router]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (activeLoginMode) return;

    // Si el feature WAREHOUSES está desactivado y hay solo 1 tienda, auto-seleccionarla
    if (!hasWarehouseFeature() && stores.length === 1 && !hasStoreSelected) {
      selectStore(stores[0], { reload: false })
        .then(() => router.replace('/dashboard'))
        .catch(() => setMode('STORE'));
      return;
    }

    if (!hasBoth) {
      if (hasStores) setMode('STORE');
      else if (hasWarehouses) setMode('WAREHOUSE');
      else setMode(null);
    } else {
      setMode('STORE');
    }
  }, [loading, isAuthenticated, activeLoginMode, hasBoth, hasStores, hasWarehouses, hasWarehouseFeature, stores, hasStoreSelected, selectStore, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const handleSelectStore = async (store: { id: string; name: string }) => {
    setError(null);
    setIsNetworkError(false);
    setIsSubmitting(true);
    try {
      await selectStore(store, { reload: false });
      router.replace('/dashboard');
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (!err?.response || err?.code === 'ECONNABORTED' || String(err?.message || '').includes('Network Error')) {
        setIsNetworkError(true);
        setError('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.');
        return;
      }

      if (status === 403) {
        setError(message || 'No tienes permisos para seleccionar esta tienda.');
        return;
      }

      if (status === 400) {
        setError(message || 'Solicitud inválida al seleccionar tienda.');
        return;
      }

      setError(message || 'Ocurrió un error al seleccionar la tienda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectWarehouse = async (warehouse: { id: string; name: string }) => {
    setError(null);
    setIsNetworkError(false);
    setIsSubmitting(true);
    try {
      await selectWarehouse(warehouse, { reload: false });
      router.replace('/dashboard');
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (!err?.response || err?.code === 'ECONNABORTED' || String(err?.message || '').includes('Network Error')) {
        setIsNetworkError(true);
        setError('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.');
        return;
      }

      if (status === 403) {
        setError(message || 'No tienes permisos para seleccionar este almacén.');
        return;
      }

      if (status === 400) {
        setError(message || 'Solicitud inválida al seleccionar almacén.');
        return;
      }

      setError(message || 'Ocurrió un error al seleccionar el almacén.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStore = mode === 'STORE';
  const items = isStore ? stores : warehouses;
  const shouldScrollItems = items.length > 4;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-elevation-2 transition-all duration-500',
            isStore ? 'bg-primary text-white rotate-0' : 'bg-amber-500 text-white rotate-[360deg]'
          )}>
            {isStore
              ? <Building2 className="h-8 w-8 transition-transform duration-500" />
              : <Warehouse className="h-8 w-8 transition-transform duration-500" />
            }
          </div>
          <h1 className="text-2xl font-bold text-text-primary">¿Cómo deseas ingresar?</h1>
          <p className="mt-1 text-sm text-text-secondary">Selecciona tu contexto para continuar</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white shadow-elevation-2 overflow-hidden flex flex-col min-h-[470px] sm:min-h-[520px] max-h-[82vh]">          
          {/* Toggle switch */}
          {hasBoth && (
            <div className="px-6 pt-6">
              <div className="relative flex items-center rounded-full bg-slate-100 p-1">
                {/* Sliding pill */}
                <span
                  className={cn(
                    'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-md transition-all duration-300 ease-in-out',
                    isStore
                      ? 'left-1 bg-primary'
                      : 'left-[calc(50%+3px)] bg-amber-500'
                  )}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setError(null); setIsNetworkError(false); setMode('STORE'); }}
                  className={cn(
                    'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300',
                    isStore ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Tienda
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setError(null); setIsNetworkError(false); setMode('WAREHOUSE'); }}
                  className={cn(
                    'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300',
                    !isStore ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Warehouse className="h-4 w-4" />
                  Almacén
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-3 flex-1 overflow-hidden">
            {!hasStores && !hasWarehouses && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                No tienes tiendas ni almacenes disponibles. Contacta al administrador.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* List heading */}
            {(hasStores || hasWarehouses) && mode && (
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {isStore ? `${stores.length} tienda${stores.length !== 1 ? 's' : ''} disponible${stores.length !== 1 ? 's' : ''}` : `${warehouses.length} almacén${warehouses.length !== 1 ? 'es' : ''} disponible${warehouses.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {/* Items list with stagger animation via CSS */}
            <div
              key={mode}
              className={cn(
                'space-y-2',
                shouldScrollItems
                  ? 'overflow-y-auto max-h-[280px] sm:max-h-[340px] pr-1'
                  : 'overflow-y-visible max-h-none'
              )}
            >
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => isStore ? handleSelectStore(item) : handleSelectWarehouse(item)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-all duration-200',
                    'hover:border-slate-300 hover:shadow-elevation-1 hover:scale-[1.01] active:scale-[0.99]',
                    'disabled:opacity-50 disabled:pointer-events-none',
                    'animate-in fade-in slide-in-from-bottom-2'
                  )}
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both', animationDuration: '300ms' }}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                    isStore
                      ? 'bg-primary-light text-primary group-hover:bg-primary group-hover:text-white'
                      : 'bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                  )}>
                    {isStore ? <Building2 className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-text-primary">{item.name}</span>
                  <ChevronRight className="h-4 w-4 text-text-disabled transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                </button>
              ))}
            </div>

            {isNetworkError && (
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => { setError(null); setIsNetworkError(false); }}
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => logout()}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
