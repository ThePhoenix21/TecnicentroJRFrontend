'use client';

import { useState, useEffect } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { authService } from '@/services/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionsSelectorForm } from '@/components/ui/permissions-selector-new';
import { userService, type CreateUserRegularDto, type UpdateUserDto } from '@/services/user.service';
import { adminRegisterService, type CreateAdminData } from '@/services/admin-register';
import { useAuth } from '@/contexts/auth-context';
import { tenantService } from '@/services/tenant.service';

const UserRole = z.enum(['ADMIN', 'USER']);
type UserRoleType = z.infer<typeof UserRole>;

const userFormSchema = z.object({
  id: z.string().optional(),
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
  role: UserRole,
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  storeId: z.string().optional(),
  permissions: z.array(z.string()).default([]),
}).refine((data) => {
  // Solo validar contraseña si estamos creando (no hay id)
  if (!data.id && data.password && !data.confirmPassword) {
    return false;
  }
  if (!data.id && data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
}).refine((data) => {
  // Si es USER y estamos creando, requiere storeId
  if (!data.id && data.role === 'USER' && !data.storeId) {
    return false;
  }
  return true;
}, {
  message: "Los usuarios tipo USER deben seleccionar una tienda",
  path: ["storeId"],
}).refine((data) => {
  // En creación, la contraseña es requerida
  if (!data.id && !data.password) {
    return false;
  }
  return true;
}, {
  message: "La contraseña es requerida para crear usuarios",
  path: ["password"],
}).refine((data) => {
  // Si hay contraseña, validar formato (solo en creación)
  if (!data.id && data.password) {
    if (data.password.length < 8) return false;
    if (!/[A-Z]/.test(data.password)) return false;
    if (!/[a-z]/.test(data.password)) return false;
    if (!/[0-9]/.test(data.password)) return false;
  }
  return true;
}, {
  message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
  path: ["password"],
}).refine((data) => {
  // Si es USER y estamos creando, el username es opcional (se genera automáticamente)
  // Si es ADMIN y estamos creando, el username también es opcional
  // No validar username requerido en creación
  return true;
}, {
  message: "El nombre de usuario es opcional",
  path: ["username"],
});

const validatePasswordRequirement = (password: string, requirement: string): boolean => {
  switch (requirement) {
    case 'length':
      return password.length >= 8;
    case 'uppercase':
      return /[A-Z]/.test(password);
    case 'number':
      return /[0-9]/.test(password);
    case 'special':
      return /[*@!#%&?]/.test(password);
    default:
      return false;
  }
};

const passwordRequirements = [
  { key: 'length', label: 'Al menos 8 caracteres', description: 'La contraseña debe tener mínimo 8 caracteres' },
  { key: 'uppercase', label: 'Una mayúscula (A-Z)', description: 'Debe incluir al menos una letra mayúscula' },
  { key: 'number', label: 'Un número (0-9)', description: 'Debe incluir al menos un número' },
  { key: 'special', label: 'Un carácter especial', description: 'Debe incluir: *, @, !, #, %, &, ?' },
];

type UserFormValues = z.infer<typeof userFormSchema>;
type UserFormControl = Control<UserFormValues>;

const DEFAULT_USER_PERMISSIONS = [
  'VIEW_INVENTORY',
  'VIEW_PRODUCTS',
  'MANAGE_PRODUCTS',
  'VIEW_SERVICES',
  'VIEW_ALL_SERVICES',
  'MANAGE_SERVICES',
  'VIEW_ORDERS',
  'MANAGE_ORDERS',
  'VIEW_CASH',
  'MANAGE_CASH',
];

const formatPermissionLabel = (permission: string): string => {
  if (!permission) return '';

  if (permission === 'VIEW_ORDERS') return 'Ver ventas';
  if (permission === 'MANAGE_ORDERS') return 'Gestionar ventas';

  const normalized = permission
    .replace(/[\s]+/g, '')
    .trim()
    .toLowerCase();

  if (!normalized) return permission;

  // Separar por separadores comunes de scopes: users.read, ventas_crear, etc.
  const tokens = permission
    .toLowerCase()
    .split(/[.:/_-]+/)
    .filter(Boolean);

  const dictionary: Record<string, string> = {
    // módulos / recursos
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

    // acciones
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

    // Fallback: capitalizar en español sin traducir
    return key.charAt(0).toUpperCase() + key.slice(1);
  });

  // Si hay dos partes, normalmente es Recurso + Acción → "Usuarios · Ver"
  if (translated.length === 2) {
    return `${translated[0]} · ${translated[1]}`;
  }

  return translated.join(' · ');
};

interface UserFormProps {
  onSuccess?: () => void;
  initialData?: Partial<UserFormValues> & {
    id?: string;
    password?: string;
    permissions?: string[];
  };
}

export function UserForm({ onSuccess, initialData }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storesCount, setStoresCount] = useState<number | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const { tenantFeatures, tenantFeaturesLoaded } = useAuth();

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasFeature = (feature: string) => !tenantFeaturesLoaded || normalizedTenantFeatures.includes(feature);

  const allowedPermissionsSet = (() => {
    if (!tenantFeaturesLoaded) return null;

    const allowed = new Set<string>();

    if (hasFeature('DASHBOARD')) {
      allowed.add('VIEW_DASHBOARD');
    }

    if (hasFeature('INVENTORY')) {
      allowed.add('VIEW_INVENTORY');
      allowed.add('MANAGE_INVENTORY');
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

    if (hasFeature('SERVICES')) {
      allowed.add('VIEW_SERVICES');
      allowed.add('VIEW_ALL_SERVICES');
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
    }

    return allowed;
  })();

  const filteredAvailablePermissions = (allowedPermissionsSet
    ? availablePermissions.filter((p) => allowedPermissionsSet.has(p))
    : availablePermissions
  ).slice();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      id: initialData?.id || '',
      name: initialData?.name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: (initialData?.role as UserRoleType) || 'USER',
      password: initialData?.password || '',
      confirmPassword: '',
      storeId: initialData?.storeId || '',
      permissions: initialData?.permissions || [],
    },
  });

    // Pre-poblar permisos básicos cuando se selecciona USER en creación
  const currentRole = form.watch('role');

  useEffect(() => {
    // Solo aplicar en modo creación (sin ID) y cuando ya se cargaron los permisos disponibles
    if (!initialData?.id && currentRole === 'USER' && availablePermissions.length > 0) {
      const currentPermissions = form.getValues('permissions');

      // Si no tiene permisos seleccionados, aplicar los por defecto
      if (currentPermissions.length === 0) {
        const validDefaults = DEFAULT_USER_PERMISSIONS.filter((p) => {
          if (!availablePermissions.includes(p)) return false;
          if (!allowedPermissionsSet) return true;
          return allowedPermissionsSet.has(p);
        });

        if (validDefaults.length > 0) {
          form.setValue('permissions', validDefaults);
        }
      }
    }
  }, [currentRole, availablePermissions, allowedPermissionsSet, initialData?.id, form]);

  useEffect(() => {
    if (!allowedPermissionsSet) return;

    const current = form.getValues('permissions') || [];
    const next = current.filter((p) => allowedPermissionsSet.has(p));

    if (next.length !== current.length) {
      form.setValue('permissions', next);
    }
  }, [allowedPermissionsSet, form]);

  // Cargar tiendas y permisos al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingStores(true);
        setIsLoadingPermissions(true);

        try {
          const count = await tenantService.getStoresCount();
          setStoresCount(count);
        } catch (error) {
          console.error('Error loading stores count:', error);
          setStoresCount(null);
        }
        
        // Cargar tiendas
        const users = await userService.getAllUsers();
        const uniqueStores = new Map<string, string>();
        
        users.forEach(user => {
          user.stores.forEach(store => {
            if (!uniqueStores.has(store.id)) {
              uniqueStores.set(store.id, store.name);
            }
          });
        });
        
        const storesArray = Array.from(uniqueStores.entries()).map(([id, name]) => ({ id, name }));
        setStores(storesArray);
        
        // Cargar permisos
        const permissions = await authService.getPermissions();
        setAvailablePermissions(permissions);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingStores(false);
        setIsLoadingPermissions(false);
      }
    };
    loadData();
  }, []);

  const shouldShowStoreSelect = (count: number | null, storesList: { id: string; name: string }[]) => {
    if (count === 1 && storesList.length === 1) return false;
    return true;
  };

  useEffect(() => {
    if (initialData?.id) return;
    if (form.watch('role') !== 'USER') return;

    if (storesCount === 1 && stores.length === 1) {
      const current = form.getValues('storeId');
      if (!current) {
        form.setValue('storeId', stores[0].id);
      }
    }
  }, [storesCount, stores, form, initialData?.id]);


  const onSubmit = async (data: UserFormValues) => {
    console.log('🚀 onSubmit se ejecutó con datos:', data);
    try {
      setIsSubmitting(true);

      console.log('=== DEBUG: Datos del formulario ===');
      console.log('initialData:', initialData);
      console.log('initialData?.id:', initialData?.id);

      if (initialData?.id) {
        console.log(' Ejecutando flujo de ACTUALIZACIÓN');
        
        // Para actualizaciones, solo enviar campos permitidos
        const updateUserData: UpdateUserDto = {
          name: data.name,
          ...(data.username && String(data.username).trim().length > 0 && {
            username: String(data.username).trim(),
          }),
          email: data.email,
          phone: data.phone,
          // Solo incluir storeId si es USER
          ...(initialData.role === 'USER' && data.storeId && { storeId: data.storeId }),
          permissions: data.permissions,
        };

        console.log('📝 Datos para actualización:', updateUserData);
        const updatedUser = await userService.updateUser(initialData.id, updateUserData);
        console.log('✅ Usuario actualizado correctamente:', updatedUser);
      } else {
        console.log('🚀 Ejecutando flujo de CREACIÓN');
        if (!data.password) {
          throw new Error('La contraseña es requerida');
        }

        if (data.role === 'ADMIN') {
          // Crear administrador usando adminRegisterService
          const adminData: CreateAdminData = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            ...(data.username && String(data.username).trim().length > 0 && {
              username: String(data.username).trim(),
            }),
            permissions: data.permissions,
          };

          console.log('🔐 Creando administrador:', adminData);
          const createdAdmin = await adminRegisterService.createAdmin(adminData);
          console.log('✅ Administrador creado exitosamente:', createdAdmin);
        } else {
          // Crear usuario regular usando userService
          const userData: CreateUserRegularDto = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            storeId: data.storeId!, // Obligatorio para USER
            ...(data.username && String(data.username).trim().length > 0 && {
              username: String(data.username).trim(),
            }),
            permissions: data.permissions,
          };

          console.log('👤 Creando usuario regular:', userData);
          const createdUser = await userService.createUser(userData);
          console.log('✅ Usuario creado exitosamente:', createdUser);
        }
      }

      toast.success(
        initialData
          ? 'Usuario actualizado correctamente'
          : data.role === 'ADMIN' 
            ? 'Administrador creado correctamente'
            : 'Usuario creado correctamente'
      );
      onSuccess?.();
    } catch (error) {
      console.error(' Error al guardar:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as any)}
        className="space-y-6"
      >
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
          {/* Loading state for stores */}
          {isLoadingStores && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Cargando tiendas...</div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control as UserFormControl}
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
            control={form.control as UserFormControl}
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
            control={form.control as UserFormControl}
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
            control={form.control as UserFormControl}
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

          {/* Campo de rol solo visible en creación */}
          {!initialData?.id && (
            <FormField
              control={form.control as UserFormControl}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="USER">Usuario</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Selector de tienda visible para USER en creación, o para edición de USER */}
          {((!initialData?.id && form.watch('role') === 'USER') || 
            (initialData?.id && initialData.role === 'USER')) && (
            shouldShowStoreSelect(storesCount, stores) && (
              <FormField
                control={form.control as UserFormControl}
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
            )
          )}

          {/* Sección de Permisos */}
          {form.watch('role') === 'USER' && (
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

          {/* Campos de contraseña solo visibles en creación */}
          {!initialData?.id && (
            <>
              <FormField
                control={form.control as UserFormControl}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as UserFormControl}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {form.watch('password') && (
            <div className="md:col-span-2 mt-4">
              <div className="bg-muted/30 rounded-lg p-4 border border-muted">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-foreground">
                    Requisitos de la contraseña
                  </span>
                </div>
                <div className="space-y-2">
                  {passwordRequirements.map((requirement) => {
                    const isValid = validatePasswordRequirement(form.watch('password') || '', requirement.key);
                    return (
                      <div
                        key={requirement.key}
                        className={`flex items-center gap-3 text-sm p-2 rounded-md transition-all duration-200 ${
                          isValid
                            ? 'bg-green-50/80 text-green-700 border border-green-200/50'
                            : 'bg-amber-50/80 text-amber-700 border border-amber-200/50'
                        }`}
                        title={requirement.description}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isValid
                            ? 'bg-green-500 text-white'
                            : 'bg-amber-400 text-white'
                        }`}>
                          {isValid ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                        </div>
                        <span className={`font-medium ${isValid ? 'line-through opacity-70' : ''}`}>
                          {requirement.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>
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
            {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
