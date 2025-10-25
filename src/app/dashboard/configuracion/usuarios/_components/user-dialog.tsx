'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserForm } from './user-form';

type User = {
  id?: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'USER';
};

type UserDialogProps = {
  children?: React.ReactNode;
  onSuccess?: () => void;
  user?: User;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UserDialog({ 
  children, 
  onSuccess, 
  user, 
  open: externalOpen,
  onOpenChange: setExternalOpen
}: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    setExternalOpen?.(newOpen);
  };

  const handleFormSuccess = () => {
    onSuccess?.();
    handleOpenChange(false);
  };

  // Map the user data to match the UserForm expected format
  const formInitialData = user ? {
    id: user.id,  // ✅ Agregar el ID para que el UserForm sepa que está editando
    name: user.name,
    username: user.username || '',
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    password: '',
    confirmPassword: '',
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <UserForm 
            initialData={formInitialData}
            onSuccess={handleFormSuccess} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
