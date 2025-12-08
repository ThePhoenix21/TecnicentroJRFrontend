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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Actualiza la información del usuario.'
              : 'Completa el formulario para crear un nuevo usuario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
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
      </DialogContent>
    </Dialog>
  );
}
