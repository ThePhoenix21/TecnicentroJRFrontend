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
import { userService, type Store, type User } from '@/services/user.service';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  // Cargar tiendas para el selector
  useEffect(() => {
    const loadStores = async () => {
      try {
        const users = await userService.getAllUsers();
        const uniqueStores = new Map<string, string>();

        // Extraer tiendas únicas de todos los usuarios
        users.forEach((user) => {
          if (user.stores) {
            user.stores.forEach((store) => {
              if (!uniqueStores.has(store.id)) {
                uniqueStores.set(store.id, store.name);
              }
            });
          }
        });

        const storesArray = Array.from(uniqueStores.entries()).map(([id, name]) => ({ 
          id, 
          name,
          address: '',
          phone: '',
          createdAt: '',
          updatedAt: '',
          createdById: ''
        } as Store));
        setStores(storesArray);
      } catch (error) {
        console.error('Error loading stores:', error);
      }
    };
    loadStores();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!user && children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 overflow-hidden">
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
