import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  permissions: string | string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'disable';
  disabledClassName?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  mode = 'hide',
  disabledClassName = 'opacity-50 cursor-not-allowed'
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const hasAccess = Array.isArray(permissions)
    ? requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : hasPermission(permissions);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (mode === 'disable' && React.isValidElement(children)) {
    const childProps = children.props as any;
    const newProps = {
      disabled: true,
      className: `${childProps.className || ''} ${disabledClassName}`,
      onClick: undefined,
      title: 'No tienes permisos para realizar esta acción'
    };
    
    return React.cloneElement(children as React.ReactElement<any>, newProps);
  }
  
  return <>{fallback}</>;
};
