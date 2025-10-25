'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

const UserRole = z.enum(['ADMIN', 'USER']);
type UserRoleType = z.infer<typeof UserRole>;

const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  username: z.string().min(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres.',
  }),
  email: z.string().email({
    message: 'Por favor ingresa un correo electrónico válido.',
  }),
  phone: z.string().min(8, {
    message: 'El número de teléfono debe tener al menos 8 dígitos.',
  }),
  role: UserRole,
  password: z.string()
    .min(8, {
      message: 'La contraseña debe tener al menos 8 caracteres.',
    })
    .regex(/[A-Z]/, {
      message: 'La contraseña debe tener al menos una mayúscula.',
    })
    .regex(/[0-9]/, {
      message: 'La contraseña debe tener al menos un número.',
    })
    .regex(/[*@!#%&?]/, {
      message: 'La contraseña debe tener al menos un carácter especial (*, @, !, #, %, &, ?).',
    })
    .optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.password && data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Las contraseñas no coinciden.',
      path: ['confirmPassword']
    });
  }

  if (!data.id && !data.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La contraseña es requerida',
      path: ['password']
    });
  }
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

interface UserFormProps {
  onSuccess?: () => void;
  initialData?: Omit<UserFormValues, 'password' | 'confirmPassword'> & {
    id?: string;
    password?: string;
  };
}

export function UserForm({ onSuccess, initialData }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: (initialData?.role as UserRoleType) || 'USER',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsSubmitting(true);

      console.log('=== DEBUG: Datos del formulario ===');
      console.log('initialData:', initialData);
      console.log('data.role:', data.role);
      console.log('initialData?.id:', initialData?.id);

      const roleChangedToAdmin = initialData && initialData.role !== 'ADMIN' && data.role === 'ADMIN';
      const emailChanged = initialData && initialData.email !== data.email;

      if (initialData?.id) {
        console.log(' Ejecutando flujo de ACTUALIZACIÓN');

        const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');

        // Crear número secuencial pequeño (últimos 4 dígitos del timestamp)
        const shortTimestamp = (Date.now() % 10000).toString().padStart(4, '0'); // 0001-9999

        // Crear email único con número secuencial pequeño
        const emailParts = data.email.split('@');
        const baseEmail = emailParts[0];
        const domainEmail = emailParts[1];
        const uniqueEmail = `${baseEmail}${shortTimestamp}@${domainEmail}`; // vitabarmartin1234@gmail.com

        if (roleChangedToAdmin || emailChanged) {
          console.log(` Cambiando ${roleChangedToAdmin ? 'rol a ADMIN' : 'email'} - usando estrategia crear + eliminar`);

          const newUserData = {
            name: data.name,
            username: `${data.username || data.name.toLowerCase().replace(/\s+/g, '')}${shortTimestamp}`, // Username con mismo número
            email: uniqueEmail, // ✅ Email único con número secuencial pequeño
            password: data.password || 'TempPass123!',
            phone: data.phone,
          };

          console.log(' Datos enviados:', JSON.stringify(newUserData, null, 2));

          const endpoint = roleChangedToAdmin ? '/auth/register' : '/users/create';
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newUserData),
          });

          console.log(`📥 Respuesta de ${endpoint}: ${response.status} ${response.statusText}`);

          if (response.ok) {
            console.log(`✅ ${roleChangedToAdmin ? 'Admin' : 'Usuario'} creado exitosamente`);

            try {
              const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${initialData.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (deleteResponse.ok) {
                console.log('✅ Usuario anterior eliminado');
              } else {
                console.warn('⚠️ No se pudo eliminar usuario anterior (restricciones SQL)');
              }
            } catch (deleteError) {
              console.warn('⚠️ Error en eliminación:', deleteError);
            }
          } else {
            const errorText = await response.text();
            console.log(`❌ Error en ${endpoint} (${response.status}):`, errorText);

            // Si falla el endpoint principal, intentar con el alternativo
            if (roleChangedToAdmin) {
              console.log('🔄 Fallback: intentando con /users/create...');
              try {
                const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/create`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify(newUserData), // ✅ Usar el mismo email único
                });

                if (fallbackResponse.ok) {
                  console.log('✅ Usuario creado via fallback, eliminando anterior...');
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${initialData.id}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                } else {
                  const fallbackErrorText = await fallbackResponse.text();
                  console.log(`❌ Error en fallback (${fallbackResponse.status}):`, fallbackErrorText);
                  throw new Error('No se pudo crear el usuario con ningún endpoint');
                }
              } catch (fallbackError) {
                console.error('❌ Error en fallback:', fallbackError);
                let errorMessage = `Error al ${roleChangedToAdmin ? 'cambiar rol' : 'actualizar'}`;
                try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.message || errorMessage;
                } catch {
                  errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
              }
            } else {
              // Para cambios de email, si falla /users/create, no hay fallback
              let errorMessage = `Error al ${roleChangedToAdmin ? 'cambiar rol' : 'actualizar'}`;
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
              } catch {
                errorMessage = errorText || errorMessage;
              }
              throw new Error(errorMessage);
            }
          }
        } else {
          console.log('📝 Cambios menores - intentando PUT...');
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${initialData.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: data.name,
                email: uniqueEmail, // ✅ Usar email único también para cambios menores
                role: data.role,
                ...(data.password && { password: data.password }),
              }),
            });

            if (response.ok) {
              console.log('✅ Usuario actualizado correctamente');
            } else {
              throw new Error(`Error: ${response.status}`);
            }
          } catch (putError) {
            console.warn('⚠️ PUT falló, usando crear + eliminar:', putError);
            const userData = {
              name: data.name,
              username: `${data.username || data.name.toLowerCase().replace(/\s+/g, '')}${shortTimestamp}`,
              email: uniqueEmail,
              phone: data.phone,
              password: data.password || 'TempPass123!',
            };

            const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(userData),
            });

            if (fallbackResponse.ok) {
              console.log('✅ Usuario actualizado via fallback');
            } else {
              const fallbackErrorText = await fallbackResponse.text();
              console.log(`❌ Error en fallback (${fallbackResponse.status}):`, fallbackErrorText);
              let errorMessage = 'Error al actualizar el usuario';
              try {
                const errorData = JSON.parse(fallbackErrorText);
                errorMessage = errorData.message || errorMessage;
              } catch {
                errorMessage = fallbackErrorText || errorMessage;
              }
              throw new Error(errorMessage);
            }
          }
        }
      } else {
        console.log(' Ejecutando flujo de CREACIÓN');
        if (!data.password) {
          throw new Error('La contraseña es requerida');
        }

        const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_KEY || 'auth_token');
        const isAdmin = data.role === 'ADMIN';
        const endpoint = isAdmin ? '/auth/register' : '/users/create';

        const userData = isAdmin
          ? {
              name: data.name,
              username: data.username,
              email: data.email, // ✅ Email original para usuarios nuevos
              password: data.password,
              phone: data.phone
            }
          : {
              name: data.name,
              username: data.username,
              email: data.email, // ✅ Email original para usuarios nuevos
              phone: data.phone,
              password: data.password
            };

        console.log(`Creando usuario ${isAdmin ? 'ADMIN' : 'regular'}:`, userData);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error creación:', errorText);
          let errorMessage = 'Error al crear el usuario';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
      }

      toast.success(
        initialData
          ? (roleChangedToAdmin
              ? 'Usuario promovido a administrador correctamente (email actualizado con número 4 dígitos)'
              : emailChanged
                ? 'Usuario actualizado con nuevo email correctamente'
                : 'Usuario actualizado correctamente')
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
                <FormLabel>Nombre de usuario</FormLabel>
                <FormControl>
                  <Input placeholder="nombredeusuario" {...field} />
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

          <FormField
            control={form.control}
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
            control={form.control}
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
