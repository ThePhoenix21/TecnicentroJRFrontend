import { useAuth } from '@/contexts/auth-context';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };
  
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };
  
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };
  
  // Métodos de conveniencia para permisos específicos
  const canViewUsers = () => hasPermission('VIEW_USERS');
  const canManageUsers = () => hasPermission('MANAGE_USERS');
  const canDeleteUsers = () => hasPermission('DELETE_USERS');
  const canViewDashboard = () => hasPermission('VIEW_DASHBOARD');
  const canViewInventory = () => hasPermission('VIEW_INVENTORY');
  const canManageInventory = () => hasPermission('MANAGE_INVENTORY');
  const canViewProducts = () => hasPermission('VIEW_PRODUCTS');
  const canManageProducts = () => hasPermission('MANAGE_PRODUCTS');
  const canViewClients = () => hasPermission('VIEW_CLIENTS');
  const canManageClients = () => hasPermission('MANAGE_CLIENTS');
  const canViewServices = () => hasPermission('VIEW_SERVICES');
  const canManageServices = () => hasPermission('MANAGE_SERVICES');
  const canViewOrders = () => hasPermission('VIEW_ORDERS');
  const canManageOrders = () => hasPermission('MANAGE_ORDERS');
  const canViewCash = () => hasPermission('VIEW_CASH');
  const canManageCash = () => hasPermission('MANAGE_CASH');
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Métodos de conveniencia
    canViewUsers,
    canManageUsers,
    canDeleteUsers,
    canViewDashboard,
    canViewInventory,
    canManageInventory,
    canViewProducts,
    canManageProducts,
    canViewClients,
    canManageClients,
    canViewServices,
    canManageServices,
    canViewOrders,
    canManageOrders,
    canViewCash,
    canManageCash,
  };
};
