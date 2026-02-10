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
