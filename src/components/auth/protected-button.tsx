import React from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface ProtectedButtonProps {
  permissions: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  mode?: 'hide' | 'disable';
  className?: string;
  disabledClassName?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  title?: string;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  permissions,
  requireAll = false,
  children,
  mode = 'hide',
  className,
  disabledClassName = 'opacity-50 cursor-not-allowed',
  onClick,
  type = 'button',
  variant = 'default',
  size = 'default',
  disabled = false,
  title,
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const hasAccess = Array.isArray(permissions)
    ? requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : hasPermission(permissions);
  
  const isDisabled = disabled || !hasAccess;
  const buttonTitle = title || (!hasAccess ? 'No tienes permisos para realizar esta acción' : undefined);
  
  if (mode === 'hide' && !hasAccess) {
    return null;
  }
  
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={cn(
        className,
        !hasAccess && mode === 'disable' && disabledClassName
      )}
      disabled={isDisabled}
      onClick={hasAccess ? onClick : undefined}
      title={buttonTitle}
      {...props}
    >
      {children}
    </Button>
  );
};
