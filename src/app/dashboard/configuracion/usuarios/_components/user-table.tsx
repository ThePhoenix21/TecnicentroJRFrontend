"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users as UsersIcon, ChevronLeft, ChevronRight, X, Building } from "lucide-react";
import { toast } from "sonner";
import { UserDialog } from "./user-dialog";
import { userService, type User } from "@/services/user.service";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * SISTEMA DE GESTIÓN DE USUARIOS CON SOFT DELETE
 *
 * Este componente implementa un sistema completo de gestión de usuarios donde:
 * - Los usuarios se eliminan con soft delete desde el backend (endpoint DELETE)
 * - Se muestra el estado del usuario (ACTIVO, INACTIVO, ELIMINADO)
 * - Hay un filtro para mostrar/ocultar usuarios eliminados
 * - Por defecto, los usuarios eliminados no se muestran
 * - La eliminación es real y persistente en el backend
 *
 * Flujo:
 * 1. Se cargan todos los usuarios del backend
 * 2. Se filtran por estado según el checkbox "Mostrar usuarios eliminados"
 * 3. Se aplican filtros adicionales de tienda y búsqueda
 * 4. Se muestra la lista filtrada con badges de estado
 */

interface UserTableProps {
  searchTerm?: string;
  storeId?: string;
  onSearchChange?: (search: string) => void;
}

export function UserTable({
  searchTerm = '',
  storeId = '',
  onSearchChange
}: UserTableProps) {
  const { canManageUsers, canDeleteUsers } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false); // Por defecto ocultar eliminados
  const itemsPerPage = 10;

  const handleEditClick = (user: User) => {
    if (!canManageUsers()) {
      toast.error('No tienes permisos para editar usuarios (MANAGE_USERS requerido)');
      return;
    }

    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleSuccess = async () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    await fetchUsers(); // Refresh the user list
  };

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔥 Iniciando fetchUsers con searchTerm:', searchTerm, 'storeId:', storeId);
      console.log('🔍 showDeletedUsers:', showDeletedUsers);
      
      const data = await userService.getAllUsers(searchTerm);
      console.log('📥 Respuesta del backend (todos los usuarios):', data);
      console.log('📊 Total usuarios del backend:', data.length);

      let filteredUsers = data.filter((user: User) => {
        // Filtrar por tienda solo si se especifica una tienda específica (no "all")
        if (storeId && storeId !== 'all' && user.stores) {
          const hasStore = user.stores.some(store => store.id === storeId);
          if (!hasStore) return false;
        }
        return true;
      });

      console.log('🏪 Usuarios después de filtro de tienda:', filteredUsers.length);

      // Filtrar usuarios eliminados si el filtro está desactivado
      if (!showDeletedUsers) {
        const beforeDeletedFilter = filteredUsers.length;
        filteredUsers = filteredUsers.filter(user => user.status !== 'DELETED');
        console.log('🗑️ Usuarios eliminados filtrados:', beforeDeletedFilter - filteredUsers.length);
        console.log('📋 Estados de TODOS los usuarios:', data.map(u => ({ name: u.name, status: u.status })));
        console.log('📋 Usuarios con status DELETED:', data.filter(u => u.status === 'DELETED').map(u => ({ name: u.name, status: u.status })));
      } else {
        console.log('✅ Filtro de eliminados DESACTIVADO - mostrando todos');
      }

      // Aplicar búsqueda si hay searchTerm
      if (searchTerm) {
        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word.length > 0);
        
        filteredUsers = filteredUsers.filter((user: User) => {
          const searchableText = [
            user.name,
            user.email,
            user.phone || ''
          ].join(' ').toLowerCase();

          return searchWords.every((word: string) =>
            searchableText.includes(word)
          );
        });

        console.log('🔍 Usuarios después de búsqueda:', filteredUsers.length);
      }

      console.log('� Usuarios finales después de todos los filtros:', filteredUsers.length);
      console.log('� Usuarios finales:', filteredUsers.map(u => ({ name: u.name, email: u.email, status: u.status })));
      
      setUsers(filteredUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, storeId, showDeletedUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleBadge = (role: string) => {
    const roleMap = {
      ADMIN: {
        label: "Administrador",
        variant:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      },
      USER: {
        label: "Usuario",
        variant:
          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      },
    };

    const { label, variant } = roleMap[role as keyof typeof roleMap] || {
      label: role,
      variant: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    return <Badge className={variant}>{label}</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    const statusMap = {
      ACTIVE: {
        label: "Activo",
        variant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
      INACTIVE: {
        label: "Inactivo", 
        variant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      DELETED: {
        label: "Eliminado",
        variant: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
    };

    const userStatus = status || 'ACTIVE';
    const { label, variant } = statusMap[userStatus as keyof typeof statusMap] || statusMap.ACTIVE;

    return <Badge className={variant}>{label}</Badge>;
  };


  const handleDelete = async (userId: string) => {
    if (!canDeleteUsers()) {
      toast.error('No tienes permisos para eliminar usuarios (DELETE_USERS requerido)');
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?\n\nEsta acción realizará un soft delete y el usuario pasará a estado 'ELIMINADO'.")) {
      return;
    }

    try {
      // Llamar al endpoint de soft delete del backend
      await userService.deleteUser(userId);
      
      // Actualizar la lista de usuarios
      await fetchUsers();

      console.log('�️ Usuario eliminado correctamente:', userId);
      toast.success("¡Usuario eliminado correctamente!");
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar el usuario";
      toast.error(`Error al eliminar el usuario: ${errorMessage}`);
    }
  };

  // Loading state with skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error al cargar los usuarios
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={fetchUsers}
                className="border-red-200 bg-white text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state with search results
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">
          {searchTerm
            ? 'No se encontraron usuarios que coincidan con la búsqueda'
            : 'No hay usuarios activos registrados'}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {searchTerm
            ? `No se encontraron usuarios activos que contengan "${searchTerm}". Intenta con otros términos de búsqueda.`
            : 'Comienza agregando un nuevo usuario al sistema.'}
        </p>
        <div className="flex space-x-3">
          {searchTerm && (
            <Button
              variant="outline"
              onClick={() => {
                if (onSearchChange) onSearchChange('');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar búsqueda
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="rounded-md border">
      {/* Filtro para mostrar usuarios eliminados */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showDeletedUsers"
            checked={showDeletedUsers}
            onChange={(e) => setShowDeletedUsers(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="showDeletedUsers" className="text-sm font-medium cursor-pointer">
            Mostrar usuarios eliminados
          </label>
        </div>
      </div>
      
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[200px]">Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell w-[120px]">Rol</TableHead>
              {/* Hide Estado, Tienda, Teléfono, Creado, Actualizado in mobile */}
              <TableHead className="hidden sm:table-cell w-[100px]">Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Tienda</TableHead>
              <TableHead className="hidden xl:table-cell">Teléfono</TableHead>
              <TableHead className="hidden xl:table-cell">Creado</TableHead>
              <TableHead className="hidden xl:table-cell">Actualizado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {currentUsers.map((user) => (
            <TableRow key={user.id} className="group hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="max-w-[200px] truncate" title={user.email}>
                  {user.email}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{getRoleBadge(user.role)}</TableCell>
              <TableCell className="hidden sm:table-cell">{getStatusBadge(user.status)}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {user.stores && user.stores.length > 0 ? (
                  <div className="space-y-1">
                    {user.stores.slice(0, 2).map((store) => (
                      <div key={store.id} className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="truncate max-w-[150px]" title={store.name}>
                          {store.name}
                        </span>
                      </div>
                    ))}
                    {user.stores.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{user.stores.length - 2} más
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {user.phone ? (
                  <a 
                    href={`tel:${user.phone}`} 
                    className="text-primary hover:underline"
                    title={`Llamar a ${user.name}`}
                  >
                    {user.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="text-sm text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString('es-ES')}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end space-x-1">
                  {canManageUsers() && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditClick(user)}
                      className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100"
                      title="Editar usuario"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {canDeleteUsers() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive/90 md:opacity-0 md:group-hover:opacity-100"
                      title="Desactivar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-muted-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-muted-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, users.length)}
                </span>{' '}
                de <span className="font-medium">{users.length}</span> usuarios
              </p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Siguiente página</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <UserDialog 
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
          setIsDialogOpen(open);
        }}
        user={editingUser || undefined}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
