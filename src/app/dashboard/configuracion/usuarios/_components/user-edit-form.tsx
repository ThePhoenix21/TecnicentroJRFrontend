'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { authService } from '@/services/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionsSelectorForm } from '@/components/ui/permissions-selector-new';
import { userService, UpdateUserDto, Store, User } from '@/services/user.service';
import { useAuth } from '@/contexts/auth-context';
import { tenantService } from '@/services/tenant.service';

// Schema para edición de usuario
const userEditSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  username: z
    .string()
    .optional()
    .refine((value) => !value || value.trim().length === 0 || value.trim().length >= 3, {
      message: 'El alias debe tener al menos 3 caracteres.',
    }),
  email: z.string().email({
    message: 'Por favor ingresa un correo electrónico válido.',
  }),
  phone: z.string().min(8, {
    message: 'El número de teléfono debe tener al menos 8 dígitos.',
  }),
  language: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  storeId: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditFormProps {
  user: User;
  stores: Store[];
  onSuccess: () => void;
}

const formatPermissionLabel = (permission: string): string => {
  if (!permission) return '';

  if (permission === 'VIEW_ORDERS') return 'Ver ventas';
  if (permission === 'MANAGE_ORDERS') return 'Gestionar ventas';

  const normalized = permission
    .replace(/[\s]+/g, '')
    .trim()
    .toLowerCase();

  if (!normalized) return permission;

  const tokens = permission
    .toLowerCase()
    .split(/[.:/_-]+/)
    .filter(Boolean);

  const dictionary: Record<string, string> = {
    users: 'Usuarios',
    user: 'Usuario',
    roles: 'Roles',
    role: 'Rol',
    permissions: 'Permisos',
    permission: 'Permiso',
    products: 'Productos',
    product: 'Producto',
    services: 'Servicios',
    service: 'Servicio',
    orders: 'Órdenes',
    order: 'Orden',
    sales: 'Ventas',
    sale: 'Venta',
    inventory: 'Inventario',
    stores: 'Tiendas',
    store: 'Tienda',
    dashboard: 'Dashboard',
    reports: 'Reportes',
    report: 'Reporte',
    clients: 'Clientes',
    client: 'Cliente',
    prices: 'Precios',
    price: 'Precio',
    cash: 'Caja',
    caja: 'Caja',

    read: 'Ver',
    view: 'Ver',
    list: 'Listar',
    create: 'Crear',
    add: 'Agregar',
    update: 'Editar',
    edit: 'Editar',
    delete: 'Eliminar',
    remove: 'Eliminar',
    manage: 'Gestionar',
    export: 'Exportar',
    print: 'Imprimir',
    approve: 'Aprobar',
    close: 'Cerrar',
  };

  const translated = tokens.map((token) => {
    const key = token.toLowerCase();
    if (dictionary[key]) return dictionary[key];
    return key.charAt(0).toUpperCase() + key.slice(1);
  });

  if (translated.length === 2) {
    return `${translated[0]} · ${translated[1]}`;
  }

  return translated.join(' · ');
};

export function UserEditForm({ user, stores, onSuccess }: UserEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userComplete, setUserComplete] = useState<User | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [storesCount, setStoresCount] = useState<number | null>(null);

  const { tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasFeature = (feature: string) => !tenantFeaturesLoaded || normalizedTenantFeatures.includes(feature);

  console.log('🔍 Features del tenant:', tenantFeatures);
  console.log('🔍 Features normalizados:', normalizedTenantFeatures);

  const allowedPermissionsSet = (() => {
    if (!tenantFeaturesLoaded) return null;

    const allowed = new Set<string>();

    if (hasFeature('DASHBOARD')) {
      allowed.add('VIEW_DASHBOARD');
    }

    if (hasFeature('INVENTORY')) {
      allowed.add('VIEW_INVENTORY');
      allowed.add('MANAGE_INVENTORY');
      allowed.add('START_PHYSICAL_INVENTORY');
    }

    if (hasFeature('SALES')) {
      allowed.add('VIEW_ORDERS');
      allowed.add('MANAGE_ORDERS');
      allowed.add('VIEW_ALL_ORDERS_HISTORY');
      allowed.add('VIEW_OWN_ORDERS_HISTORY');
    }

    if (hasFeature('PRODUCTS')) {
      allowed.add('VIEW_PRODUCTS');
      allowed.add('MANAGE_PRODUCTS');
      allowed.add('MANAGE_PRICES');
      allowed.add('VIEW_PRODUCT_PRICES');
      allowed.add('VIEW_PRODUCT_COST');
      allowed.add('DELETE_PRODUCTS');
    }

    if (hasFeature('CLIENTS')) {
      allowed.add('VIEW_CLIENTS');
      allowed.add('MANAGE_CLIENTS');
    }

    if (hasFeature('USERS')) {
      allowed.add('VIEW_USERS');
      allowed.add('MANAGE_USERS');
      allowed.add('DELETE_USERS');
    }

    if (hasFeature('STORES')) {
      allowed.add('VIEW_STORES');
      allowed.add('MANAGE_STORES');
      allowed.add('CHANGE_STORE_LOGO');
    }

    if (hasFeature('SERVICES')) {
      allowed.add('VIEW_SERVICES');
      allowed.add('MANAGE_SERVICES');
    }

    if (hasFeature('SALES')) {
      allowed.add('VIEW_ORDERS');
      allowed.add('MANAGE_ORDERS');
    }

    if (hasFeature('SALESOFPRODUCTS') && hasFeature('PRODUCTS')) {
      allowed.add('VIEW_ORDERS');
      allowed.add('MANAGE_ORDERS');
    }

    if (hasFeature('SALESOFSERVICES') && hasFeature('SERVICES')) {
      allowed.add('VIEW_ORDERS');
      allowed.add('MANAGE_ORDERS');
    }

    if (hasFeature('CASH')) {
      allowed.add('VIEW_CASH');
      allowed.add('MANAGE_CASH');
      allowed.add('VIEW_ALL_CASH_HISTORY');
      allowed.add('VIEW_OWN_CASH_HISTORY');
      allowed.add('PRINT_CASH_CLOSURE');
    }

    if (hasFeature('EMPLOYEES')) {
      allowed.add('VIEW_EMPLOYEES');
      allowed.add('MANAGE_EMPLOYEES');
      allowed.add('CONVERT_EMPLOYEE_TO_USER');
    }

    if (hasFeature('WAREHOUSES')) {
      allowed.add('VIEW_WAREHOUSES');
      allowed.add('MANAGE_WAREHOUSES');
    }

    if (hasFeature('SUPPLIERS')) {
      allowed.add('VIEW_SUPPLIERS');
      allowed.add('MANAGE_SUPPLIERS');
      allowed.add('DELETE_SUPPLIERS');
    }

    if (hasFeature('SUPPLY_ORDERS')) {
      allowed.add('VIEW_SUPPLY_ORDERS');
      allowed.add('CREATE_SUPPLY_ORDER');
      allowed.add('EDIT_EMITTED_SUPPLY_ORDER');
      allowed.add('APPROVE_SUPPLY_ORDER');
      allowed.add('RECEIVE_SUPPLY_ORDER');
      allowed.add('CANCEL_SUPPLY_ORDER');
    }

    if (hasFeature('SUPPORT')) {
      allowed.add('VIEW_SUPPORT');
      allowed.add('MANAGE_SUPPORT');
    }

    return allowed;
  })();

  const filteredAvailablePermissions = (allowedPermissionsSet
    ? availablePermissions.filter((p) => allowedPermissionsSet.has(p))
    : availablePermissions
  ).slice();

  // Cargar permisos al montar
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setIsLoadingPermissions(true);
        const permissions = await authService.getPermissions();
        setAvailablePermissions(permissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    loadPermissions();
  }, []);

  useEffect(() => {
    const loadStoresCount = async () => {
      try {
        const count = await tenantService.getStoresCount();
        setStoresCount(count);
      } catch (error) {
        console.error('Error loading stores count:', error);
        setStoresCount(null);
      }
    };
    loadStoresCount();
  }, []);

  const shouldShowStoreSelect = (count: number | null, storesList: Store[]) => {
    if (count === 1 && storesList.length === 1) return false;
    return true;
  };

  // Obtener el usuario completo al montar el componente
  useEffect(() => {
    const fetchUserComplete = async () => {
      try {
        console.log('🔍 Obteniendo usuario completo con getUserById...');
        const completeUser = await userService.getUserById(user.id);
        console.log('🔍 Usuario completo obtenido:', completeUser);
        setUserComplete(completeUser);
      } catch (error) {
        console.error('❌ Error al obtener usuario completo:', error);
        setUserComplete(user);
      }
    };

    fetchUserComplete();
  }, [user.id]);

  const form = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      phone: '',
      language: 'es',
      timezone: 'America/Lima',
      status: 'ACTIVE',
      storeId: '',
      permissions: [],
    },
  });

  // Resetear el formulario cuando userComplete esté disponible
  useEffect(() => {
    if (userComplete) {
      form.reset({
        name: userComplete.name || '',
        username: userComplete.username || '',
        email: userComplete.email || '',
        phone: userComplete.phone || '',
        language: userComplete.language || 'es',
        timezone: userComplete.timezone || 'America/Lima',
        status: (userComplete.status === 'ACTIVE' || userComplete.status === 'INACTIVE') ? userComplete.status : 'ACTIVE',
        storeId: userComplete.stores?.[0]?.id || '',
        permissions: userComplete.permissions || [],
      });
    }
  }, [userComplete, form]);

  useEffect(() => {
    if (user.role !== 'USER') return;

    if (storesCount === 1 && stores.length === 1) {
      const current = form.getValues('storeId');
      if (!current) {
        form.setValue('storeId', stores[0].id);
      }
    }
  }, [storesCount, stores, form, user.role]);

  useEffect(() => {
    if (!allowedPermissionsSet) return;

    const current = form.getValues('permissions') || [];
    
    console.log('🔍 Permisos actuales del usuario:', current);
    console.log('🔍 Permisos permitidos por tenant:', Array.from(allowedPermissionsSet));
    
    // NO filtrar los permisos existentes del usuario
    // Solo mostrar advertencia si hay permisos no permitidos
    const nonAllowedPermissions = current.filter((p: string) => !allowedPermissionsSet.has(p));
    if (nonAllowedPermissions.length > 0) {
      console.log('⚠️ Permisos no permitidos por tenant:', nonAllowedPermissions);
    }
  }, [allowedPermissionsSet, form]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      console.log('🚀 Actualizando usuario:', data);

      // Construir payload según el rol del usuario
      const updatePayload: UpdateUserDto = {
        name: data.name,
        ...(data.username && String(data.username).trim().length > 0 && {
          username: String(data.username).trim(),
        }),
        email: data.email,
        phone: data.phone,
        language: data.language || 'es',
        timezone: data.timezone || 'America/Lima',
        status: data.status || 'ACTIVE',
        // Solo incluir storeId si es USER y hay una tienda seleccionada
        ...(user.role === 'USER' && data.storeId && { storeId: data.storeId }),
        permissions: data.permissions,
      };

      console.log('📝 Payload para actualizar:', updatePayload);

      const updatedUser = await userService.updateUser(user.id, updatePayload);
      console.log('✅ Usuario actualizado correctamente:', updatedUser);

      toast.success('Usuario actualizado correctamente');
      onSuccess();
    } catch (error) {
      console.error('❌ Error al actualizar usuario:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del usuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alias (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="alias"
                    autoComplete="nickname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+51 987 654 321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idioma</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un idioma" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona horaria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una zona horaria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="America/Lima">America/Lima</SelectItem>
                    <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Solo mostrar selector de tienda para usuarios USER */}
          {user.role === 'USER' && shouldShowStoreSelect(storesCount, stores) && (
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tienda asignada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una tienda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {/* Sección de Permisos */}
          {user.role === 'USER' && (
            <PermissionsSelectorForm
                name="permissions"
                availablePermissions={availablePermissions}
                isLoading={isLoadingPermissions}
                title="Permisos"
                description="Selecciona los permisos que tendrá este usuario"
                columns={3}
                maxHeight="max-h-64"
                className="md:col-span-2 space-y-4 border rounded-lg p-4"
              />
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Actualizando...' : 'Actualizar usuario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
