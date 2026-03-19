"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface PermissionEntry {
  key: string;
  label: string;
  description: string;
}

interface PermissionSection {
  id: string;
  label: string;
  permissions: PermissionEntry[];
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: "dashboard",
    label: "Panel de control",
    permissions: [
      { key: "VIEW_DASHBOARD", label: "Ver panel principal", description: "Accede al panel principal con resumen del negocio" },
      { key: "VIEW_ANALYTICS", label: "Ver análisis y métricas", description: "Visualiza reportes de ventas, ingresos y rendimiento" },
    ],
  },
  {
    id: "stores",
    label: "Tiendas",
    permissions: [
      { key: "VIEW_STORES", label: "Ver tiendas", description: "Ver el listado de tiendas registradas" },
      { key: "MANAGE_STORES", label: "Gestionar tiendas", description: "Crear, editar y eliminar tiendas" },
      { key: "CHANGE_STORE_LOGO", label: "Cambiar logo de tienda", description: "Modificar la imagen o logo de una tienda" },
    ],
  },
  {
    id: "warehouses",
    label: "Almacenes",
    permissions: [
      { key: "VIEW_WAREHOUSES", label: "Ver almacenes", description: "Ver el listado de almacenes disponibles" },
      { key: "MANAGE_WAREHOUSES", label: "Gestionar almacenes", description: "Crear, editar y eliminar almacenes" },
      { key: "VIEW_WAREHOUSE_PRODUCTS", label: "Ver productos de almacén", description: "Consultar el catálogo de productos en el almacén" },
      { key: "MANAGE_WAREHOUSE_PRODUCTS", label: "Gestionar productos de almacén", description: "Agregar, editar y eliminar productos en el almacén" },
      { key: "VIEW_WAREHOUSE_MOVEMENTS", label: "Ver movimientos de almacén", description: "Consultar entradas y salidas del almacén" },
      { key: "MANAGE_WAREHOUSE_MOVEMENTS", label: "Gestionar movimientos de almacén", description: "Registrar entradas y salidas del almacén" },
      { key: "VIEW_WAREHOUSE_COUNTS", label: "Ver conteos de almacén", description: "Consultar los conteos físicos del almacén" },
      { key: "MANAGE_WAREHOUSE_COUNTS", label: "Gestionar conteos de almacén", description: "Iniciar y gestionar conteos físicos en el almacén" },
      { key: "VIEW_WAREHOUSE_SUPPLIERS", label: "Ver proveedores de almacén", description: "Consultar proveedores asociados al almacén" },
      { key: "MANAGE_WAREHOUSE_SUPPLIERS", label: "Gestionar proveedores de almacén", description: "Agregar y administrar proveedores del almacén" },
      { key: "VIEW_WAREHOUSE_RECEPTIONS", label: "Ver recepciones de almacén", description: "Consultar las recepciones de mercancía" },
      { key: "MANAGE_WAREHOUSE_RECEPTIONS", label: "Gestionar recepciones de almacén", description: "Registrar y procesar recepciones de mercancía" },
    ],
  },
  {
    id: "cash",
    label: "Caja",
    permissions: [
      { key: "VIEW_CASH", label: "Ver caja", description: "Consultar el estado actual de la caja" },
      { key: "MANAGE_CASH", label: "Operar caja", description: "Aperturar, cerrar y registrar movimientos de caja" },
      { key: "VIEW_ALL_CASH_HISTORY", label: "Ver historial completo de caja", description: "Acceder al historial de todos los operadores" },
      { key: "VIEW_OWN_CASH_HISTORY", label: "Ver historial propio de caja", description: "Consultar únicamente el historial propio" },
      { key: "VIEW_ALL_CASH_OPEN", label: "Ver todas las cajas abiertas", description: "Ver el estado de las cajas actualmente abiertas" },
      { key: "PRINT_CASH_CLOSURE", label: "Imprimir cierre de caja", description: "Imprimir el comprobante de cierre de caja" },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    permissions: [
      { key: "VIEW_ORDERS", label: "Ver órdenes de venta", description: "Consultar las órdenes y ventas registradas" },
      { key: "MANAGE_ORDERS", label: "Gestionar órdenes", description: "Crear, editar y cancelar órdenes de venta" },
      { key: "DETAIL_ORDERS", label: "Ver detalles de órdenes", description: "Acceder a la información completa de cada orden" },
      { key: "VIEW_ALL_ORDERS_HISTORY", label: "Ver historial completo de ventas", description: "Consultar el historial de todos los usuarios" },
      { key: "VIEW_OWN_ORDERS_HISTORY", label: "Ver historial propio de ventas", description: "Consultar únicamente el propio historial de ventas" },
    ],
  },
  {
    id: "services",
    label: "Servicios",
    permissions: [
      { key: "VIEW_SERVICES", label: "Ver servicios", description: "Consultar los servicios disponibles" },
      { key: "VIEW_ALL_SERVICES", label: "Ver todos los servicios", description: "Acceder a todos los servicios del sistema" },
      { key: "DETAIL_SERVICES", label: "Ver detalles de servicios", description: "Consultar información detallada de cada servicio" },
      { key: "MANAGE_SERVICES", label: "Gestionar servicios", description: "Crear y administrar servicios personalizados" },
    ],
  },
  {
    id: "products",
    label: "Productos",
    permissions: [
      { key: "VIEW_PRODUCTS", label: "Ver catálogo de productos", description: "Consultar el catálogo de productos disponibles" },
      { key: "MANAGE_PRODUCTS", label: "Gestionar productos", description: "Crear, editar y desactivar productos" },
      { key: "MANAGE_PRICES", label: "Gestionar precios", description: "Modificar los precios de los productos" },
      { key: "VIEW_PRODUCT_COST", label: "Ver costos de productos", description: "Consultar el costo de adquisición de los productos" },
      { key: "VIEW_PRODUCT_PRICES", label: "Ver precios de productos", description: "Consultar los precios de venta de los productos" },
      { key: "DELETE_PRODUCTS", label: "Eliminar productos", description: "Eliminar productos permanentemente del catálogo" },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    permissions: [
      { key: "VIEW_INVENTORY", label: "Ver inventario", description: "Consultar el inventario general de la tienda" },
      { key: "MANAGE_INVENTORY", label: "Gestionar inventario", description: "Realizar ajustes y movimientos de inventario" },
      { key: "START_PHYSICAL_INVENTORY", label: "Iniciar conteo físico", description: "Iniciar un conteo físico de inventario" },
      { key: "ADJUST_CLOSE_INVENTORY", label: "Ajustar y cerrar inventario", description: "Aplicar ajustes y cerrar conteos de inventario" },
    ],
  },
  {
    id: "stock_transfers",
    label: "Movimientos de Stock",
    permissions: [
      { key: "VIEW_STOCK_TRANSFERS", label: "Ver transferencias", description: "Consultar las transferencias entre almacenes y tiendas" },
      { key: "CREATE_STOCK_TRANSFER", label: "Crear transferencias", description: "Iniciar nuevas transferencias de stock" },
      { key: "CONFIRM_STOCK_TRANSFER", label: "Confirmar transferencias", description: "Confirmar la recepción de transferencias" },
      { key: "CANCEL_STOCK_TRANSFER", label: "Cancelar transferencias", description: "Cancelar transferencias pendientes" },
      { key: "EDIT_STOCK_TRANSFER", label: "Editar transferencias", description: "Modificar transferencias en estado pendiente" },
      { key: "RECEIVE_STOCK_TRANSFER", label: "Recibir transferencias", description: "Registrar la recepción de mercancía transferida" },
    ],
  },
  {
    id: "suppliers",
    label: "Proveedores",
    permissions: [
      { key: "VIEW_SUPPLIERS", label: "Ver proveedores", description: "Consultar el listado de proveedores registrados" },
      { key: "MANAGE_SUPPLIERS", label: "Gestionar proveedores", description: "Crear y editar proveedores" },
      { key: "DELETE_SUPPLIERS", label: "Eliminar proveedores", description: "Eliminar proveedores del sistema" },
    ],
  },
  {
    id: "supply_orders",
    label: "Órdenes de suministro",
    permissions: [
      { key: "VIEW_SUPPLY_ORDERS", label: "Ver órdenes de compra", description: "Consultar las órdenes de compra a proveedores" },
      { key: "CREATE_SUPPLY_ORDER", label: "Crear órdenes de compra", description: "Generar nuevas órdenes de compra" },
      { key: "EDIT_EMITTED_SUPPLY_ORDER", label: "Editar órdenes emitidas", description: "Modificar órdenes de compra ya emitidas" },
      { key: "APPROVE_SUPPLY_ORDER", label: "Aprobar órdenes de compra", description: "Autorizar órdenes de compra para su proceso" },
      { key: "RECEIVE_SUPPLY_ORDER", label: "Recibir mercancía", description: "Registrar la recepción de mercancía de una orden" },
      { key: "CANCEL_SUPPLY_ORDER", label: "Cancelar órdenes de compra", description: "Anular órdenes de compra en proceso" },
    ],
  },
  {
    id: "employees",
    label: "Empleados",
    permissions: [
      { key: "VIEW_EMPLOYEES", label: "Ver empleados", description: "Consultar el listado de empleados" },
      { key: "MANAGE_EMPLOYEES", label: "Gestionar empleados", description: "Crear, editar y eliminar empleados" },
      { key: "CONVERT_EMPLOYEE_TO_USER", label: "Convertir empleado a usuario", description: "Crear un usuario del sistema a partir de un empleado" },
      { key: "RECREATE_EMPLOYEE", label: "Recrear empleado", description: "Recuperar un empleado que fue eliminado" },
    ],
  },
  {
    id: "clients",
    label: "Clientes",
    permissions: [
      { key: "VIEW_CLIENTS", label: "Ver clientes", description: "Consultar el listado de clientes registrados" },
      { key: "MANAGE_CLIENTS", label: "Gestionar clientes", description: "Crear, editar y eliminar clientes" },
    ],
  },
  {
    id: "users",
    label: "Usuarios",
    permissions: [
      { key: "VIEW_USERS", label: "Ver usuarios", description: "Consultar el listado de usuarios del sistema" },
      { key: "MANAGE_USERS", label: "Gestionar usuarios", description: "Crear, editar y asignar roles a usuarios" },
      { key: "DELETE_USERS", label: "Eliminar usuarios", description: "Eliminar usuarios del sistema" },
    ],
  },
  {
    id: "support",
    label: "Soporte Técnico",
    permissions: [
      { key: "VIEW_SUPPORT", label: "Ver tickets de soporte", description: "Consultar los tickets de soporte técnico" },
      { key: "MANAGE_SUPPORT", label: "Gestionar tickets de soporte", description: "Responder y administrar tickets de soporte" },
    ],
  },
];

const PERMISSION_MAP = new Map<string, PermissionEntry>(
  PERMISSION_SECTIONS.flatMap((s) => s.permissions.map((p) => [p.key, p]))
);

function getPermissionInfo(key: string): PermissionEntry {
  return PERMISSION_MAP.get(key) ?? { key, label: key, description: "" };
}

interface SectionBlockProps {
  section: PermissionSection;
  visibleKeys: string[];
  selectedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
  onToggleAll: (keys: string[], allSelected: boolean) => void;
}

function SectionBlock({ section, visibleKeys, selectedKeys, onToggle, onToggleAll }: SectionBlockProps) {
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.includes(k));
  const someSelected = visibleKeys.some((k) => selectedKeys.includes(k));

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40 rounded-t-lg">
        <span className="text-sm font-semibold tracking-tight text-primary/80 dark:text-primary/70">{section.label}</span>
        <button
          type="button"
          onClick={() => onToggleAll(visibleKeys, allSelected)}
          className="text-xs text-primary/70 hover:text-primary transition-colors"
        >
          {allSelected ? "Deseleccionar sección" : someSelected ? "Seleccionar todos" : "Seleccionar sección"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px p-3">
        {visibleKeys.map((key) => {
          const info = getPermissionInfo(key);
          const checked = selectedKeys.includes(key);
          return (
            <label
              key={key}
              className="flex items-start gap-3 rounded-md p-2 cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(val) => onToggle(key, val as boolean)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{info.label}</p>
                {info.description && (
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{info.description}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
  maxHeight = "max-h-[480px]",
  className = "space-y-3",
}: PermissionsSelectorProps) {
  const availableSet = new Set(availablePermissions);

  const handleToggle = (key: string, checked: boolean) => {
    if (checked) {
      onPermissionChange([...selectedPermissions, key]);
    } else {
      onPermissionChange(selectedPermissions.filter((p) => p !== key));
    }
  };

  const handleToggleAll = (keys: string[], allSelected: boolean) => {
    if (allSelected) {
      onPermissionChange(selectedPermissions.filter((p) => !keys.includes(p)));
    } else {
      const toAdd = keys.filter((k) => !selectedPermissions.includes(k));
      onPermissionChange([...selectedPermissions, ...toAdd]);
    }
  };

  const handleGlobalToggle = (selectAll: boolean) => {
    if (selectAll) {
      onPermissionChange(Array.from(new Set([...selectedPermissions, ...availablePermissions])));
    } else {
      onPermissionChange(selectedPermissions.filter((p) => !availableSet.has(p)));
    }
  };

  const allSelected = availablePermissions.length > 0 && availablePermissions.every((p) => selectedPermissions.includes(p));
  const selectedCount = availablePermissions.filter((p) => selectedPermissions.includes(p)).length;

  const visibleSections = PERMISSION_SECTIONS
    .map((section) => ({
      ...section,
      visibleKeys: section.permissions.map((p) => p.key).filter((k) => availableSet.has(k)),
    }))
    .filter((s) => s.visibleKeys.length > 0);

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {!isLoading && availablePermissions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {selectedCount}/{availablePermissions.length} seleccionados
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => handleGlobalToggle(!allSelected)}
            >
              {allSelected ? "Quitar todos" : "Seleccionar todos"}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Cargando permisos...</div>
      ) : availablePermissions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No hay permisos disponibles</div>
      ) : (
        <div className={`${maxHeight} overflow-y-auto space-y-3 pr-1`}>
          {visibleSections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              visibleKeys={section.visibleKeys}
              selectedKeys={selectedPermissions}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          ))}
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
  maxHeight = "max-h-[480px]",
  className = "md:col-span-2 space-y-4",
}: PermissionsSelectorFormProps) {
  const form = useFormContext();
  const availableSet = new Set(availablePermissions);

  const visibleSections = PERMISSION_SECTIONS
    .map((section) => ({
      ...section,
      visibleKeys: section.permissions.map((p) => p.key).filter((k) => availableSet.has(k)),
    }))
    .filter((s) => s.visibleKeys.length > 0);

  return (
    <div className={className}>
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => {
          const selectedPermissions: string[] = field.value || [];
          const allSelected = availablePermissions.length > 0 && availablePermissions.every((p) => selectedPermissions.includes(p));
          const selectedCount = availablePermissions.filter((p) => selectedPermissions.includes(p)).length;

          const handleToggle = (key: string, checked: boolean) => {
            if (checked) {
              field.onChange([...selectedPermissions, key]);
            } else {
              field.onChange(selectedPermissions.filter((p) => p !== key));
            }
          };

          const handleToggleAll = (keys: string[], allSel: boolean) => {
            if (allSel) {
              field.onChange(selectedPermissions.filter((p) => !keys.includes(p)));
            } else {
              const toAdd = keys.filter((k) => !selectedPermissions.includes(k));
              field.onChange([...selectedPermissions, ...toAdd]);
            }
          };

          const handleGlobalToggle = (selectAll: boolean) => {
            if (selectAll) {
              field.onChange(Array.from(new Set([...selectedPermissions, ...availablePermissions])));
            } else {
              field.onChange(selectedPermissions.filter((p) => !availableSet.has(p)));
            }
          };

          return (
            <FormItem className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {!isLoading && availablePermissions.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {selectedCount}/{availablePermissions.length} seleccionados
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => handleGlobalToggle(!allSelected)}
                    >
                      {allSelected ? "Quitar todos" : "Seleccionar todos"}
                    </Button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Cargando permisos...</div>
              ) : availablePermissions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No hay permisos disponibles</div>
              ) : (
                <div className={`${maxHeight} overflow-y-auto space-y-3 pr-1`}>
                  {visibleSections.map((section) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      visibleKeys={section.visibleKeys}
                      selectedKeys={selectedPermissions}
                      onToggle={handleToggle}
                      onToggleAll={handleToggleAll}
                    />
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}
