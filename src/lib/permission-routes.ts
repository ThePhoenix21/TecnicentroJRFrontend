const permissionRouteMap: Record<string, string> = {
  VIEW_DASHBOARD: "/dashboard",
  VIEW_STORES: "/dashboard/tiendas",
  VIEW_CASH: "/dashboard/caja",
  VIEW_ORDERS: "/dashboard/ventas",
  VIEW_SERVICES: "/dashboard/servicios",
  VIEW_ALL_SERVICES: "/dashboard/servicios",
  VIEW_PRODUCTS: "/dashboard/productos",
  VIEW_INVENTORY: "/dashboard/inventario",
  VIEW_SUPPORT: "/dashboard/support",
  VIEW_WAREHOUSES: "/dashboard/warehouses",
  VIEW_SUPPLY_ORDERS: "/dashboard/ordenes-suministro",
  VIEW_CLIENTS: "/dashboard/clientes",
  VIEW_EMPLOYEES: "/dashboard/empleados",
  VIEW_SUPPLIERS: "/dashboard/proveedores",
  VIEW_USERS: "/dashboard/configuracion/usuarios",
};

export function getRouteForViewPermission(permission?: string): string | null {
  if (!permission) return null;
  const normalized = permission.trim().toUpperCase();
  if (!normalized.startsWith("VIEW_")) {
    return null;
  }
  return permissionRouteMap[normalized] || null;
}

export function getFirstAccessibleRouteFromPermissions(
  permissions: string[] | undefined | null,
  options?: { isRouteAllowed?: (route: string) => boolean }
): string | null {
  if (!Array.isArray(permissions)) return null;
  for (const permission of permissions) {
    const route = getRouteForViewPermission(permission);
    if (!route) continue;
    if (options?.isRouteAllowed && !options.isRouteAllowed(route)) {
      continue;
    }
    return route;
  }
  return null;
}
