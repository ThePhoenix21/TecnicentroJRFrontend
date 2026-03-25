'use client';

import { useState, useEffect } from 'react';
import { useForm, type Control, type FieldErrors } from 'react-hook-form';
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
import { tenantService } from '@/services/tenant.service';
import { useTenantFeatures } from '@/hooks/useTenantFeatures';
import { AssignmentType, type Store, type Warehouse, type UserFormData } from '@/types/user.types';
import { storeService } from '@/services/store.service';
import { warehouseService } from '@/services/warehouse.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      message: 'El apellido debe tener al menos 3 caracteres.',
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
  assignmentType: z.enum(['store', 'warehouse']).default('store'), // ✅ NUEVO: Selector de tipo
  storeId: z.string().optional(),
  warehouseId: z.string().optional(),
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
  // Validar XOR solo para usuarios regulares en creación
  if (!data.id && data.role === 'USER') {
    if (data.assignmentType === 'store' && !data.storeId) {
      return false;
    }
    if (data.assignmentType === 'warehouse' && !data.warehouseId) {
      return false;
    }
  }
  return true;
}, {
  message: "Debe seleccionar una tienda o almacén",
  path: ["storeId"],
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
  // En creación, la contraseña es requerida
  if (!data.id && !data.password) {
    return false;
  }
  return true;
}, {
  message: "La contraseña es requerida para crear usuarios",
  path: ["password"],
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
  'VIEW_PRODUCTS',
  'MANAGE_PRODUCTS',
  'MANAGE_PRICES',
  'VIEW_PRODUCT_PRICES',
  'VIEW_SERVICES',
  'DETAIL_SERVICES',
  'MANAGE_SERVICES',
  'VIEW_ORDERS',
  'MANAGE_ORDERS',
  'DETAIL_ORDERS',
  'VIEW_OWN_ORDERS_HISTORY',
  'VIEW_OWN_CASH_HISTORY',
  'VIEW_CASH',
  'MANAGE_CASH',
  'VIEW_SUPPORT',
  'MANAGE_SUPPORT',
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
    analytics: 'Analíticas',
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
    detail: 'Detalle',
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
    assignmentType?: AssignmentType; // ✅ NUEVO
    storeId?: string;
    warehouseId?: string;
  };
}

export function UserForm({ onSuccess, initialData }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const { hasFeature, hasWarehouse } = useTenantFeatures();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as any,
    mode: 'onChange',
    defaultValues: {
      id: initialData?.id || '',
      name: initialData?.name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: (initialData?.role as UserRoleType) || 'USER',
      password: initialData?.password || '',
      confirmPassword: '',
      assignmentType: initialData?.assignmentType || 'store', // ✅ NUEVO: Selector de tipo
      storeId: initialData?.storeId || '',
      warehouseId: initialData?.warehouseId || '',
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
        const validDefaults = DEFAULT_USER_PERMISSIONS.filter((p) => availablePermissions.includes(p));

        if (validDefaults.length > 0) {
          form.setValue('permissions', validDefaults);
        }
      }
    }
  }, [currentRole, availablePermissions, initialData?.id, form]);

  // Cargar tiendas, almacenes y permisos al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingStores(true);
        setIsLoadingWarehouses(true);
        setIsLoadingPermissions(true);

        // Cargar tiendas
        const storesData = await storeService.getAllStores();
        setStores(storesData);

        // Solo cargar almacenes si está en modo WAREHOUSE y el tenant tiene la feature WAREHOUSES
        let warehousesData: any[] = [];
        if (form.watch('assignmentType') === 'warehouse' && hasWarehouse()) {
          warehousesData = await warehouseService.getWarehousesSimple();
        }

        // Transformar datos de almacenes al formato esperado
        const formattedWarehouses = (warehousesData || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          address: w.address || null,
          phone: w.phone || null,
          createdAt: w.createdAt || '',
          updatedAt: w.updatedAt || '',
          createdById: w.createdById || null
        }));

        setWarehouses(formattedWarehouses);

        // Cargar permisos
        const permissions = await authService.getPermissions();
        setAvailablePermissions(permissions);

      } catch (error: any) {
        console.error('Error loading data:', error);
        toast.error(error?.response?.data?.message || error?.message || 'Error al cargar datos');
      } finally {
        setIsLoadingStores(false);
        setIsLoadingWarehouses(false);
        setIsLoadingPermissions(false);
      }
    };
    loadData();
  }, [form.watch('assignmentType')]);

  const shouldShowStoreSelect = (storesList: Store[]) => {
    return storesList.length > 0;
  };

  const shouldShowWarehouseSelect = (warehousesList: Warehouse[]) => {
    return warehousesList.length > 0;
  };

  useEffect(() => {
    if (initialData?.id) return;
    if (form.watch('role') !== 'USER') return;

    // Auto-seleccionar si hay solo una opción disponible
    const assignmentType = form.watch('assignmentType');
    if (assignmentType === 'store' && stores.length === 1 && !form.getValues('storeId')) {
      form.setValue('storeId', stores[0].id);
    } else if (assignmentType === 'warehouse' && warehouses.length === 1 && !form.getValues('warehouseId')) {
      form.setValue('warehouseId', warehouses[0].id);
    }
  }, [stores, warehouses, form, initialData?.id]);


  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true);

      if (initialData?.id) {

        // Para actualizaciones, solo enviar campos permitidos
        const updateUserData: UpdateUserDto = {
          name: data.name,
          ...(data.username && String(data.username).trim().length > 0 && {
            username: String(data.username).trim(),
          }),
          email: data.email,
          phone: data.phone,
          // Aplicar lógica XOR para asignación
          ...(data.assignmentType === 'store' && data.storeId && { storeId: data.storeId }),
          ...(data.assignmentType === 'warehouse' && data.warehouseId && { warehouseId: data.warehouseId }),
          permissions: data.permissions,
        };

        const updatedUser = await userService.updateUser(initialData.id, updateUserData);
      } else {
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

          const createdAdmin = await adminRegisterService.createAdmin(adminData);
        } else {
          // Crear usuario regular usando userService con lógica XOR
          const userData: CreateUserRegularDto = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            // Aplicar lógica XOR: solo uno de los dos
            ...(data.assignmentType === 'store' ? { storeId: data.storeId } : { warehouseId: data.warehouseId }),
            ...(data.username && String(data.username).trim().length > 0 && {
              username: String(data.username).trim(),
            }),
            permissions: data.permissions,
          };

          const createdUser = await userService.createUser(userData);
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
      toast.error(error instanceof Error ? error.message : 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<UserFormValues>) => {
    const firstError = Object.values(errors)[0];
    const message =
      (firstError && 'message' in firstError && typeof firstError.message === 'string'
        ? firstError.message
        : undefined) || 'Revisa los campos obligatorios antes de guardar.';
    toast.error(message);
    console.warn('Formulario inválido:', errors);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any, handleInvalidSubmit)} className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="permissions">Permisos de usuario</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
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
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="apellido"
                      autoComplete="off"
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
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'ADMIN') {
                          form.setValue('storeId', '');
                          form.setValue('warehouseId', '');
                          form.setValue('assignmentType', 'store');
                        }
                      }}
                    >
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

            {/* Selector de tipo de asignación visible para USER en creación, o para edición de USER */}
            {((!initialData?.id && form.watch('role') === 'USER') ||
              (initialData?.id && initialData.role === 'USER')) && (
              <>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control as UserFormControl}
                    name="assignmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de asignación</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Limpiar selecciones anteriores al cambiar tipo
                            form.setValue('storeId', '');
                            form.setValue('warehouseId', '');
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo de asignación" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="store">🏪 Tienda</SelectItem>
                            {/* Solo mostrar opción de almacén si el tenant tiene la feature WAREHOUSES */}
                            {hasWarehouse() && (
                              <SelectItem value="warehouse">🏭 Almacén</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('assignmentType') === 'store' && shouldShowStoreSelect(stores) && (
                  <FormField
                    control={form.control as UserFormControl}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tienda asignada</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingStores ? "Cargando..." : "Selecciona una tienda"} />
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

                {form.watch('assignmentType') === 'warehouse' && shouldShowWarehouseSelect(warehouses) && (
                  <FormField
                    control={form.control as UserFormControl}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Almacén asignado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingWarehouses ? "Cargando..." : "Selecciona un almacén"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}


            {/* Campos de contraseña solo visibles en creación */}
            {!initialData?.id && (
              <>
                <FormField
                  control={form.control as UserFormControl}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crear contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
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
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-warning/10 text-foreground border border-warning/20'
                          }`}
                          title={requirement.description}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                            isValid
                              ? 'bg-success text-white'
                              : 'bg-warning text-white'
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
          </TabsContent>

          <TabsContent value="permissions" className="pb-2">
            {form.watch('role') === 'USER' ? (
              <PermissionsSelectorForm
                name="permissions"
                availablePermissions={availablePermissions}
                isLoading={isLoadingPermissions}
                title="Permisos de usuario"
                description="Selecciona los permisos que tendrá este usuario"
                maxHeight="max-h-[480px]"
              />
            ) : (
              <div className="text-sm text-muted-foreground py-10 text-center border rounded-lg">
                Los permisos solo están disponibles para el rol <span className="font-medium">Usuario</span>.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-10">
            {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
