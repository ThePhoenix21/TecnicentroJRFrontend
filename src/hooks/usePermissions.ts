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
  
  // Métodos de conveniencia por módulo
  
  // Dashboard
  const canViewDashboard = () => hasPermission(PERMISSIONS.VIEW_DASHBOARD);
  
  // Tiendas
  const canViewStores = () => hasPermission(PERMISSIONS.VIEW_STORES);
  const canManageStores = () => hasPermission(PERMISSIONS.MANAGE_STORES);
  const canChangeStoreLogo = () => hasPermission(PERMISSIONS.CHANGE_STORE_LOGO);
  
  // Caja
  const canViewCash = () => hasPermission(PERMISSIONS.VIEW_CASH);
  const canManageCash = () => hasPermission(PERMISSIONS.MANAGE_CASH);
  const canViewAllCashHistory = () => hasPermission(PERMISSIONS.VIEW_ALL_CASH_HISTORY);
  const canViewOwnCashHistory = () => hasPermission(PERMISSIONS.VIEW_OWN_CASH_HISTORY);
  const canPrintCashClosure = () => hasPermission(PERMISSIONS.PRINT_CASH_CLOSURE);
  
  // Ventas
  const canViewOrders = () => hasPermission(PERMISSIONS.VIEW_ORDERS);
  const canManageOrders = () => hasPermission(PERMISSIONS.MANAGE_ORDERS);
  const canViewAllOrdersHistory = () => hasPermission(PERMISSIONS.VIEW_ALL_ORDERS_HISTORY);
  const canViewOwnOrdersHistory = () => hasPermission(PERMISSIONS.VIEW_OWN_ORDERS_HISTORY);
  
  // Servicios
  const canViewServices = () => hasPermission(PERMISSIONS.VIEW_SERVICES);
  const canManageServices = () => hasPermission(PERMISSIONS.MANAGE_SERVICES);
  
  // Productos
  const canViewProducts = () => hasPermission(PERMISSIONS.VIEW_PRODUCTS);
  const canManageProducts = () => hasPermission(PERMISSIONS.MANAGE_PRODUCTS);
  const canManagePrices = () => hasPermission(PERMISSIONS.MANAGE_PRICES);
  const canViewProductCost = () => hasPermission(PERMISSIONS.VIEW_PRODUCT_COST);
  const canViewProductPrices = () => hasPermission(PERMISSIONS.VIEW_PRODUCT_PRICES);
  const canDeleteProducts = () => hasPermission(PERMISSIONS.DELETE_PRODUCTS);
  
  // Inventario
  const canViewInventory = () => hasPermission(PERMISSIONS.VIEW_INVENTORY);
  const canManageInventory = () => hasPermission(PERMISSIONS.MANAGE_INVENTORY);
  const canStartPhysicalInventory = () => hasPermission(PERMISSIONS.START_PHYSICAL_INVENTORY);
  
  // Almacenes
  const canViewWarehouses = () => hasPermission(PERMISSIONS.VIEW_WAREHOUSES);
  const canManageWarehouses = () => hasPermission(PERMISSIONS.MANAGE_WAREHOUSES);
  
  // Clientes
  const canViewClients = () => hasPermission(PERMISSIONS.VIEW_CLIENTS);
  const canManageClients = () => hasPermission(PERMISSIONS.MANAGE_CLIENTS);
  
  // Empleados
  const canViewEmployees = () => hasPermission(PERMISSIONS.VIEW_EMPLOYEES);
  const canManageEmployees = () => hasPermission(PERMISSIONS.MANAGE_EMPLOYEES);
  const canConvertEmployeeToUser = () => hasPermission(PERMISSIONS.CONVERT_EMPLOYEE_TO_USER);
  
  // Proveedores
  const canViewSuppliers = () => hasPermission(PERMISSIONS.VIEW_SUPPLIERS);
  const canManageSuppliers = () => hasPermission(PERMISSIONS.MANAGE_SUPPLIERS);
  const canDeleteSuppliers = () => hasPermission(PERMISSIONS.DELETE_SUPPLIERS);
  
  // Órdenes de suministro
  const canViewSupplyOrders = () => hasPermission(PERMISSIONS.VIEW_SUPPLY_ORDERS);
  const canCreateSupplyOrder = () => hasPermission(PERMISSIONS.CREATE_SUPPLY_ORDER);
  const canEditEmittedSupplyOrder = () => hasPermission(PERMISSIONS.EDIT_EMITTED_SUPPLY_ORDER);
  const canApproveSupplyOrder = () => hasPermission(PERMISSIONS.APPROVE_SUPPLY_ORDER);
  const canReceiveSupplyOrder = () => hasPermission(PERMISSIONS.RECEIVE_SUPPLY_ORDER);
  const canCancelSupplyOrder = () => hasPermission(PERMISSIONS.CANCEL_SUPPLY_ORDER);
  
  // Usuarios y accesos
  const canViewUsers = () => hasPermission(PERMISSIONS.VIEW_USERS);
  const canManageUsers = () => hasPermission(PERMISSIONS.MANAGE_USERS);
  const canDeleteUsers = () => hasPermission(PERMISSIONS.DELETE_USERS);
  
  // Soporte técnico
  const canViewSupport = () => hasPermission(PERMISSIONS.VIEW_SUPPORT);
  const canManageSupport = () => hasPermission(PERMISSIONS.MANAGE_SUPPORT);
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
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
