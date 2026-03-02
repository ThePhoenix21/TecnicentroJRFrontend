'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Warehouse, AlertTriangle } from 'lucide-react';

type InitialContextMode = 'STORE' | 'WAREHOUSE';

export default function SelectInitialContextPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, activeLoginMode, hasStoreSelected, hasWarehouseSelected, selectStore, selectWarehouse, logout } = useAuth();
  const [mode, setMode] = useState<InitialContextMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const stores = useMemo(() => user?.stores || [], [user?.stores]);
  const warehouses = useMemo(() => user?.warehouses || [], [user?.warehouses]);

  const hasStores = stores.length > 0;
  const hasWarehouses = warehouses.length > 0;
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
  }, [loading, isAuthenticated, activeLoginMode, hasStoreSelected, hasWarehouseSelected, router]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (activeLoginMode) return;

    if (!hasBoth) {
      if (hasStores) setMode('STORE');
      else if (hasWarehouses) setMode('WAREHOUSE');
      else setMode(null);
    }
  }, [loading, isAuthenticated, activeLoginMode, hasBoth, hasStores, hasWarehouses]);

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
      await selectStore(store);
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
      await selectWarehouse(warehouse);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Selecciona tu contexto inicial
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => logout()}
            >
              Cerrar sesión
            </Button>
          </div>
          <CardDescription>Tu sesión no tiene un modo activo. Elige cómo quieres ingresar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasStores && !hasWarehouses && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No tienes tiendas ni almacenes disponibles para seleccionar. Contacta al administrador.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {hasBoth && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'STORE' ? 'default' : 'outline'}
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setIsNetworkError(false);
                  setMode('STORE');
                }}
                className="justify-start"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Ingresar por Tienda
              </Button>
              <Button
                type="button"
                variant={mode === 'WAREHOUSE' ? 'default' : 'outline'}
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setIsNetworkError(false);
                  setMode('WAREHOUSE');
                }}
                className="justify-start"
              >
                <Warehouse className="h-4 w-4 mr-2" />
                Ingresar por Almacén
              </Button>
            </div>
          )}

          {mode === 'STORE' && hasStores && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Tiendas</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stores.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleSelectStore(s)}
                    className="justify-start"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    <span className="truncate">{s.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {mode === 'WAREHOUSE' && hasWarehouses && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Almacenes</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {warehouses.map((w) => (
                  <Button
                    key={w.id}
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleSelectWarehouse(w)}
                    className="justify-start"
                  >
                    <Warehouse className="h-4 w-4 mr-2" />
                    <span className="truncate">{w.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {isNetworkError && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setIsNetworkError(false);
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
