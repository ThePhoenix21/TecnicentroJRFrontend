'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserForm } from './user-form';
import { UserEditForm } from './user-edit-form';
import { storeService } from '@/services/store.service';
import { warehouseService } from '@/services/warehouse.service';
import { useAuth } from '@/contexts/auth-context';
import { type Store, type Warehouse, type UserResponse as User } from '@/types/user.types';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  children,
}: UserDialogProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { activeLoginMode } = useAuth();

  const handleFormSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  // Cargar tiendas y almacenes para los selectores
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const storesData = await storeService.getAllStores();
        
        // Solo cargar almacenes si está en modo WAREHOUSE o tiene el feature
        let warehousesData: any[] = [];
        if (activeLoginMode === 'WAREHOUSE') {
          warehousesData = await warehouseService.getWarehousesSimple();
        }

        // Transformar datos de almacenes al formato esperado
        const formattedWarehouses = (warehousesData || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          address: w.address || null,
          phone: w.phone || null,
          createdAt: w.createdAt || '',
          updatedAt: w.updatedAt || '',
          createdById: w.createdById || null
        }));

        setStores(storesData || []);
        setWarehouses(formattedWarehouses);
      } catch (error) {
        console.error('Error loading stores and warehouses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeLoginMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!user && children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[680px] lg:max-w-[920px] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription className="text-sm">
              {user
                ? 'Actualiza la información del usuario.'
                : 'Completa el formulario para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            {user ? (
              // Modo edición: usar el nuevo formulario
              <UserEditForm
                user={user}
                stores={stores}
                warehouses={warehouses} // ✅ NUEVO: Pasar almacenes
                onSuccess={handleFormSuccess}
              />
            ) : (
              // Modo creación: usar el mismo UserForm pero con initialData undefined
              <UserForm
                initialData={undefined}
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
