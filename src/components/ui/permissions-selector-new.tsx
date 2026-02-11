"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";

const formatPermissionLabel = (permission: string): string => {
  if (!permission) return "";
  if (permission === "VIEW_ORDERS") return "Ver ventas";
  if (permission === "MANAGE_ORDERS") return "Gestionar ventas";
  if (permission === "VIEW_STORES") return "Ver tiendas";
  if (permission === "MANAGE_STORES") return "Gestionar tiendas";
  if (permission === "CHANGE_STORE_LOGO") return "Cambiar logo de tienda";
  if (permission === "VIEW_ALL_CASH_HISTORY") return "Ver todo el historial de caja";
  if (permission === "VIEW_OWN_CASH_HISTORY") return "Ver mi historial de caja";
  if (permission === "PRINT_CASH_CLOSURE") return "Imprimir cierre de caja";
  if (permission === "VIEW_EMPLOYEES") return "Ver empleados";
  if (permission === "MANAGE_EMPLOYEES") return "Gestionar empleados";
  if (permission === "CONVERT_EMPLOYEE_TO_USER") return "Convertir empleado en usuario";
  if (permission === "VIEW_SUPPLIERS") return "Ver proveedores";
  if (permission === "MANAGE_SUPPLIERS") return "Gestionar proveedores";
  if (permission === "DELETE_SUPPLIERS") return "Eliminar proveedores";
  if (permission === "VIEW_SUPPLY_ORDERS") return "Ver órdenes de suministro";
  if (permission === "CREATE_SUPPLY_ORDER") return "Crear orden de suministro";
  if (permission === "EDIT_EMITTED_SUPPLY_ORDER") return "Editar orden emitida";
  if (permission === "APPROVE_SUPPLY_ORDER") return "Aprobar orden de suministro";
  if (permission === "RECEIVE_SUPPLY_ORDER") return "Recibir orden de suministro";
  if (permission === "CANCEL_SUPPLY_ORDER") return "Anular orden de suministro";
  if (permission === "VIEW_SUPPORT") return "Ver soporte técnico";
  if (permission === "MANAGE_SUPPORT") return "Gestionar soporte técnico";
  if (permission === "VIEW_USERS") return "Ver usuarios";
  if (permission === "MANAGE_USERS") return "Gestionar usuarios";
  if (permission === "DELETE_USERS") return "Eliminar usuarios";
  if (permission === "VIEW_ALL_ORDERS_HISTORY") return "Ver todo el historial de ventas";
  if (permission === "VIEW_OWN_ORDERS_HISTORY") return "Ver mi historial de ventas";
  if (permission === "VIEW_WAREHOUSES") return "Ver almacenes";
  if (permission === "MANAGE_WAREHOUSES") return "Gestionar almacenes";
  if (permission === "VIEW_DASHBOARD") return "Ver panel de control";
  if (permission === "VIEW_CASH") return "Ver caja";
  if (permission === "MANAGE_CASH") return "Gestionar caja";
  if (permission === "VIEW_SERVICES") return "Ver servicios";
  if (permission === "MANAGE_SERVICES") return "Gestionar servicios";
  if (permission === "VIEW_PRODUCTS") return "Ver productos";
  if (permission === "MANAGE_PRODUCTS") return "Gestionar productos";
  if (permission === "MANAGE_PRICES") return "Gestionar precios";
  if (permission === "VIEW_PRODUCT_COST") return "Ver costo de productos";
  if (permission === "VIEW_PRODUCT_PRICES") return "Ver precios de productos";
  if (permission === "DELETE_PRODUCTS") return "Eliminar productos";
  if (permission === "VIEW_INVENTORY") return "Ver inventario";
  if (permission === "MANAGE_INVENTORY") return "Gestionar inventario";
  if (permission === "START_PHYSICAL_INVENTORY") return "Iniciar inventario físico";
  if (permission === "VIEW_CLIENTS") return "Ver clientes";
  if (permission === "MANAGE_CLIENTS") return "Gestionar clientes";

  const tokens = permission
    .toLowerCase()
    .split(/[.:/_-]+/)
    .filter(Boolean);

  const dictionary: Record<string, string> = {
    users: "Usuarios",
    user: "Usuario",
    roles: "Roles",
    role: "Rol",
    permissions: "Permisos",
    permission: "Permiso",
    products: "Productos",
    product: "Producto",
    services: "Servicios",
    service: "Servicio",
    orders: "Órdenes",
    order: "Orden",
    sales: "Ventas",
    sale: "Venta",
    inventory: "Inventario",
    stores: "Tiendas",
    store: "Tienda",
    dashboard: "Dashboard",
    reports: "Reportes",
    report: "Reporte",
    clients: "Clientes",
    client: "Cliente",
    prices: "Precios",
    price: "Precio",
    cash: "Caja",
    caja: "Caja",
    employees: "Empleados",
    employee: "Empleado",
    suppliers: "Proveedores",
    supplier: "Proveedor",
    supply: "Suministro",
    support: "Soporte",
    warehouses: "Almacenes",
    warehouse: "Almacén",
    read: "Ver",
    view: "Ver",
    list: "Listar",
    create: "Crear",
    add: "Agregar",
    update: "Editar",
    edit: "Editar",
    delete: "Eliminar",
    remove: "Eliminar",
    manage: "Gestionar",
    export: "Exportar",
    print: "Imprimir",
    approve: "Aprobar",
    close: "Cerrar",
  };

  const translated = tokens.map((token) => {
    const key = token.toLowerCase();
    if (dictionary[key]) return dictionary[key];
    return key.charAt(0).toUpperCase() + key.slice(1);
  });

  if (translated.length === 2) {
    return `${translated[0]} · ${translated[1]}`;
  }

  return translated.join(" · ");
};

interface PermissionsSelectorProps {
  selectedPermissions: string[];
  availablePermissions: string[];
  isLoading: boolean;
  onPermissionChange: (permissions: string[]) => void;
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  maxHeight?: string;
  className?: string;
}

export function PermissionsSelector({
  selectedPermissions,
  availablePermissions,
  isLoading,
  onPermissionChange,
  title = "Permisos",
  description = "Selecciona los permisos para el usuario",
  columns = 2,
  maxHeight = "max-h-56",
  className = "space-y-3",
}: PermissionsSelectorProps) {
  const getGridCols = () => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-1 sm:grid-cols-2";
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      onPermissionChange([...selectedPermissions, permission]);
    } else {
      onPermissionChange(selectedPermissions.filter((p) => p !== permission));
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando permisos...</div>
      ) : (
        <div className={`${maxHeight} overflow-y-auto pr-1`}>
          <div className={`grid ${getGridCols()} gap-3`}>
            {availablePermissions.map((permission) => (
              <div key={permission} className="flex items-start gap-2 text-sm p-2 rounded hover:bg-accent/50">
                <Checkbox
                  checked={selectedPermissions.includes(permission)}
                  onCheckedChange={(checked) => 
                    handlePermissionChange(permission, checked as boolean)
                  }
                  className="mt-1"
                />
                <span 
                  className="select-none cursor-pointer flex-1"
                  onClick={() => {
                    const newValue = !selectedPermissions.includes(permission);
                    handlePermissionChange(permission, newValue);
                  }}
                >
                  {formatPermissionLabel(permission)}
                </span>
              </div>
            ))}
            {availablePermissions.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay permisos disponibles</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PermissionsSelectorFormProps {
  name: string;
  availablePermissions: string[];
  isLoading: boolean;
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  maxHeight?: string;
  className?: string;
}

export function PermissionsSelectorForm({
  name,
  availablePermissions,
  isLoading,
  title = "Permisos",
  description = "Selecciona los permisos que tendrá este usuario",
  columns = 2,
  maxHeight = "max-h-64",
  className = "md:col-span-2 space-y-4 border rounded-lg p-4",
}: PermissionsSelectorFormProps) {
  const form = useFormContext();

  const getGridCols = () => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-1 md:grid-cols-2";
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando permisos...</div>
      ) : (
        <FormField
          control={form.control}
          name={name}
          render={() => (
            <FormItem>
              <div className={`${maxHeight} overflow-y-auto pr-1`}>
                <div className={`grid ${getGridCols()} gap-4`}>
                  {availablePermissions.map((permission) => (
                    <FormField
                      key={permission}
                      control={form.control}
                      name={name}
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={permission}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(permission)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), permission])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value: string) => value !== permission
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm cursor-pointer">
                              {formatPermissionLabel(permission)}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                {availablePermissions.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No hay permisos disponibles
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
