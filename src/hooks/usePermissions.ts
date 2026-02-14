import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';

// Definición de permisos del backend
export const PERMISSIONS = {
  // dashboard
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',

  // tiendas
  VIEW_STORES: 'VIEW_STORES',
  MANAGE_STORES: 'MANAGE_STORES',
  CHANGE_STORE_LOGO: 'CHANGE_STORE_LOGO',

  // caja
  VIEW_CASH: 'VIEW_CASH',
  MANAGE_CASH: 'MANAGE_CASH',
  VIEW_ALL_CASH_HISTORY: 'VIEW_ALL_CASH_HISTORY',
  VIEW_OWN_CASH_HISTORY: 'VIEW_OWN_CASH_HISTORY',
  PRINT_CASH_CLOSURE: 'PRINT_CASH_CLOSURE',

  // ventas
  VIEW_ORDERS: 'VIEW_ORDERS',
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  VIEW_ALL_ORDERS_HISTORY: 'VIEW_ALL_ORDERS_HISTORY',
  VIEW_OWN_ORDERS_HISTORY: 'VIEW_OWN_ORDERS_HISTORY',

  // servicios
  VIEW_SERVICES: 'VIEW_SERVICES',
  VIEW_ALL_SERVICES: 'VIEW_ALL_SERVICES',
  MANAGE_SERVICES: 'MANAGE_SERVICES',

  // productos
  VIEW_PRODUCTS: 'VIEW_PRODUCTS',
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',
  MANAGE_PRICES: 'MANAGE_PRICES',
  VIEW_PRODUCT_COST: 'VIEW_PRODUCT_COST',
  VIEW_PRODUCT_PRICES: 'VIEW_PRODUCT_PRICES',
  DELETE_PRODUCTS: 'DELETE_PRODUCTS',

  // inventario
  VIEW_INVENTORY: 'VIEW_INVENTORY',
  MANAGE_INVENTORY: 'MANAGE_INVENTORY',
  START_PHYSICAL_INVENTORY: 'START_PHYSICAL_INVENTORY',

  // almacenes
  VIEW_WAREHOUSES: 'VIEW_WAREHOUSES',
  MANAGE_WAREHOUSES: 'MANAGE_WAREHOUSES',

  // clientes
  VIEW_CLIENTS: 'VIEW_CLIENTS',
  MANAGE_CLIENTS: 'MANAGE_CLIENTS',

  // empleados
  VIEW_EMPLOYEES: 'VIEW_EMPLOYEES',
  MANAGE_EMPLOYEES: 'MANAGE_EMPLOYEES',
  CONVERT_EMPLOYEE_TO_USER: 'CONVERT_EMPLOYEE_TO_USER',

  // proveedores
  VIEW_SUPPLIERS: 'VIEW_SUPPLIERS',
  MANAGE_SUPPLIERS: 'MANAGE_SUPPLIERS',
  DELETE_SUPPLIERS: 'DELETE_SUPPLIERS',

  // ordenes de suministro
  VIEW_SUPPLY_ORDERS: 'VIEW_SUPPLY_ORDERS',
  CREATE_SUPPLY_ORDER: 'CREATE_SUPPLY_ORDER',
  EDIT_EMITTED_SUPPLY_ORDER: 'EDIT_EMITTED_SUPPLY_ORDER',
  APPROVE_SUPPLY_ORDER: 'APPROVE_SUPPLY_ORDER',
  RECEIVE_SUPPLY_ORDER: 'RECEIVE_SUPPLY_ORDER',
  CANCEL_SUPPLY_ORDER: 'CANCEL_SUPPLY_ORDER',

  // usuarios y accesos
  VIEW_USERS: 'VIEW_USERS',
  MANAGE_USERS: 'MANAGE_USERS',
  DELETE_USERS: 'DELETE_USERS',

  // soporte técnico
  VIEW_SUPPORT: 'VIEW_SUPPORT',
  MANAGE_SUPPORT: 'MANAGE_SUPPORT',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const usePermissions = () => {
  const { user, isAdmin, hasPermission: contextHasPermission } = useAuth();

  const resolvePermission = useMemo(() => {
    return (permission: string): boolean => {
      if (isAdmin) return true;
      if (typeof contextHasPermission === 'function') {
        return contextHasPermission(permission);
      }
      return user?.permissions?.includes(permission) ?? false;
    };
  }, [contextHasPermission, isAdmin, user?.permissions]);

  const hasPermission = useMemo(() => {
    return (permission: string) => resolvePermission(permission);
  }, [resolvePermission]);

  const hasAnyPermission = useMemo(() => {
    return (permissions: string[]): boolean => permissions.some((p) => resolvePermission(p));
  }, [resolvePermission]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: string[]): boolean => permissions.every((p) => resolvePermission(p));
  }, [resolvePermission]);

  // API heredada: can/canAny/canAll para permisos tipados (útil para UI/guards)
  const can = useMemo(() => {
    return (permission: Permission) => resolvePermission(permission);
  }, [resolvePermission]);

  const canAny = useMemo(() => {
    return (permissions: Permission[]) => permissions.some((p) => can(p));
  }, [can]);

  const canAll = useMemo(() => {
    return (permissions: Permission[]) => permissions.every((p) => can(p));
  }, [can]);
  
  // Métodos de conveniencia por módulo
  
  // Dashboard
  const canViewDashboard = () => resolvePermission(PERMISSIONS.VIEW_DASHBOARD);
  
  // Tiendas
  const canViewStores = () => resolvePermission(PERMISSIONS.VIEW_STORES);
  const canManageStores = () => resolvePermission(PERMISSIONS.MANAGE_STORES);
  const canChangeStoreLogo = () => resolvePermission(PERMISSIONS.CHANGE_STORE_LOGO);
  
  // Caja
  const canViewCash = () => resolvePermission(PERMISSIONS.VIEW_CASH);
  const canManageCash = () => resolvePermission(PERMISSIONS.MANAGE_CASH);
  const canViewAllCashHistory = () => resolvePermission(PERMISSIONS.VIEW_ALL_CASH_HISTORY);
  const canViewOwnCashHistory = () => resolvePermission(PERMISSIONS.VIEW_OWN_CASH_HISTORY);
  const canPrintCashClosure = () => resolvePermission(PERMISSIONS.PRINT_CASH_CLOSURE);
  
  // Ventas
  const canViewOrders = () => resolvePermission(PERMISSIONS.VIEW_ORDERS);
  const canManageOrders = () => resolvePermission(PERMISSIONS.MANAGE_ORDERS);
  const canViewAllOrdersHistory = () => resolvePermission(PERMISSIONS.VIEW_ALL_ORDERS_HISTORY);
  const canViewOwnOrdersHistory = () => resolvePermission(PERMISSIONS.VIEW_OWN_ORDERS_HISTORY);
  
  // Helper combinado para historial (regla: VIEW_ORDERS + (ALL u OWN))
  const canViewOrdersHistory = () => 
    canViewOrders() && (canViewAllOrdersHistory() || canViewOwnOrdersHistory());
  
  // Servicios
  const canViewServices = () =>
    resolvePermission(PERMISSIONS.VIEW_SERVICES) ||
    resolvePermission(PERMISSIONS.VIEW_ALL_SERVICES);
  const canManageServices = () => resolvePermission(PERMISSIONS.MANAGE_SERVICES);
  
  // Productos
  const canViewProducts = () => resolvePermission(PERMISSIONS.VIEW_PRODUCTS);
  const canManageProducts = () => resolvePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const canManagePrices = () => resolvePermission(PERMISSIONS.MANAGE_PRICES);
  const canViewProductCost = () => resolvePermission(PERMISSIONS.VIEW_PRODUCT_COST);
  const canViewProductPrices = () => resolvePermission(PERMISSIONS.VIEW_PRODUCT_PRICES);
  const canDeleteProducts = () => resolvePermission(PERMISSIONS.DELETE_PRODUCTS);
  
  // Inventario
  const canViewInventory = () => resolvePermission(PERMISSIONS.VIEW_INVENTORY);
  const canManageInventory = () => resolvePermission(PERMISSIONS.MANAGE_INVENTORY);
  const canStartPhysicalInventory = () => resolvePermission(PERMISSIONS.START_PHYSICAL_INVENTORY);
  
  // Almacenes
  const canViewWarehouses = () => resolvePermission(PERMISSIONS.VIEW_WAREHOUSES);
  const canManageWarehouses = () => resolvePermission(PERMISSIONS.MANAGE_WAREHOUSES);
  
  // Clientes
  const canViewClients = () => resolvePermission(PERMISSIONS.VIEW_CLIENTS);
  const canManageClients = () => resolvePermission(PERMISSIONS.MANAGE_CLIENTS);
  
  // Empleados
  const canViewEmployees = () => resolvePermission(PERMISSIONS.VIEW_EMPLOYEES);
  const canManageEmployees = () => resolvePermission(PERMISSIONS.MANAGE_EMPLOYEES);
  const canConvertEmployeeToUser = () => resolvePermission(PERMISSIONS.CONVERT_EMPLOYEE_TO_USER);
  
  // Proveedores
  const canViewSuppliers = () => resolvePermission(PERMISSIONS.VIEW_SUPPLIERS);
  const canManageSuppliers = () => resolvePermission(PERMISSIONS.MANAGE_SUPPLIERS);
  const canDeleteSuppliers = () => resolvePermission(PERMISSIONS.DELETE_SUPPLIERS);
  
  // Órdenes de suministro
  const canViewSupplyOrders = () => resolvePermission(PERMISSIONS.VIEW_SUPPLY_ORDERS);
  const canCreateSupplyOrder = () => resolvePermission(PERMISSIONS.CREATE_SUPPLY_ORDER);
  const canEditEmittedSupplyOrder = () => resolvePermission(PERMISSIONS.EDIT_EMITTED_SUPPLY_ORDER);
  const canApproveSupplyOrder = () => resolvePermission(PERMISSIONS.APPROVE_SUPPLY_ORDER);
  const canReceiveSupplyOrder = () => resolvePermission(PERMISSIONS.RECEIVE_SUPPLY_ORDER);
  const canCancelSupplyOrder = () => resolvePermission(PERMISSIONS.CANCEL_SUPPLY_ORDER);
  
  // Usuarios y accesos
  const canViewUsers = () => resolvePermission(PERMISSIONS.VIEW_USERS);
  const canManageUsers = () => resolvePermission(PERMISSIONS.MANAGE_USERS);
  const canDeleteUsers = () => resolvePermission(PERMISSIONS.DELETE_USERS);
  
  // Soporte técnico
  const canViewSupport = () => resolvePermission(PERMISSIONS.VIEW_SUPPORT);
  const canManageSupport = () => resolvePermission(PERMISSIONS.MANAGE_SUPPORT);
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    canAny,
    canAll,
    // Exportar constantes para uso en componentes
    PERMISSIONS,
    // Métodos de conveniencia por módulo
    canViewDashboard,
    
    // Tiendas
    canViewStores,
    canManageStores,
    canChangeStoreLogo,
    
    // Caja
    canViewCash,
    canManageCash,
    canViewAllCashHistory,
    canViewOwnCashHistory,
    canPrintCashClosure,
    
    // Ventas
    canViewOrders,
    canManageOrders,
    canViewAllOrdersHistory,
    canViewOwnOrdersHistory,
    canViewOrdersHistory,
    
    // Servicios
    canViewServices,
    canManageServices,
    
    // Productos
    canViewProducts,
    canManageProducts,
    canManagePrices,
    canViewProductCost,
    canViewProductPrices,
    canDeleteProducts,
    
    // Inventario
    canViewInventory,
    canManageInventory,
    canStartPhysicalInventory,
    
    // Almacenes
    canViewWarehouses,
    canManageWarehouses,
    
    // Clientes
    canViewClients,
    canManageClients,
    
    // Empleados
    canViewEmployees,
    canManageEmployees,
    canConvertEmployeeToUser,
    
    // Proveedores
    canViewSuppliers,
    canManageSuppliers,
    canDeleteSuppliers,
    
    // Órdenes de suministro
    canViewSupplyOrders,
    canCreateSupplyOrder,
    canEditEmittedSupplyOrder,
    canApproveSupplyOrder,
    canReceiveSupplyOrder,
    canCancelSupplyOrder,
    
    // Usuarios y accesos
    canViewUsers,
    canManageUsers,
    canDeleteUsers,
    
    // Soporte técnico
    canViewSupport,
    canManageSupport,
  };
};
