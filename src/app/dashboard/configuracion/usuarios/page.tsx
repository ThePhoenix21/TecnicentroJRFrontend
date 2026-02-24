
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, X, Building } from 'lucide-react';
import { UserTable } from './_components/user-table';
import { UserDialog } from './_components/user-dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { userService } from '@/services/user.service';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDeniedView } from '@/components/auth/access-denied-view';
import { ProtectedButton } from '@/components/auth/protected-button';

export default function UsersPage() {
  const { canViewUsers } = usePermissions();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState('all');
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Verificar permisos de acceso
  if (!canViewUsers()) {
    return <AccessDeniedView />;
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load stores from users
  useEffect(() => {
    const loadStoresFromUsers = async () => {
      try {
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
      } catch (error) {
        console.error('Error loading stores from users:', error);
      }
    };
    loadStoresFromUsers();
  }, []);

  const handleUserCreated = () => {
    setRefreshKey((prev: number) => prev + 1);
    setIsNewUserDialogOpen(false); // Cerrar diálogo después de crear
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger refresh with new search term
    setRefreshKey((prev: number) => prev + 1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedStore('all');
    setDebouncedSearchTerm('');
    setRefreshKey((prev: number) => prev + 1);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Usuarios Activos</CardTitle>
                <p className="text-sm text-muted-foreground">Lista de usuarios activos del sistema (desactivados no se muestran)</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <ProtectedButton
                  permissions="MANAGE_USERS"
                  onClick={() => setIsNewUserDialogOpen(true)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-medium">Nuevo Usuario</span>
                </ProtectedButton>
                <UserDialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen} onSuccess={handleUserCreated}>
                  <div />
                </UserDialog>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="w-full">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar entre usuarios activos por nombre, email, teléfono..."
                    className="pl-10 pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 max-w-xs">
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                      <Building className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por tienda..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las tiendas</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(searchTerm || selectedStore !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="h-10 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
              
              {(debouncedSearchTerm || selectedStore !== 'all') && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Filtrando por:
                    {debouncedSearchTerm && ` "${debouncedSearchTerm}"`}
                    {debouncedSearchTerm && selectedStore !== 'all' && " - "}
                    {selectedStore !== 'all' && ` tienda: ${stores.find(s => s.id === selectedStore)?.name}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <UserTable
            key={refreshKey}
            searchTerm={debouncedSearchTerm}
            storeId={selectedStore}
            onSearchChange={setSearchTerm}
          />
        </CardContent>
      </Card>
    </div>
  );
}
