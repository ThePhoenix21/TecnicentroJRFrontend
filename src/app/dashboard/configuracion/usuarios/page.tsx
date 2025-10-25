
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, X } from 'lucide-react';
import { UserTable } from './_components/user-table';
import { UserDialog } from './_components/user-dialog';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function UsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleUserCreated = () => {
    setRefreshKey((prev: number) => prev + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger refresh with new search term
    setRefreshKey((prev: number) => prev + 1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setRefreshKey((prev: number) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Usuarios Activos</h1>
              <p className="text-sm text-muted-foreground">Lista de usuarios activos del sistema (desactivados no se muestran)</p>
            </div>
            <UserDialog onSuccess={handleUserCreated}>
              <Button className="whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </UserDialog>
          </div>
          
          <div className="flex flex-col space-y-3 pt-2">
            <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar entre usuarios activos por nombre, email, teléfono o usuario..."
                  className="pl-9"
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
              <Button type="submit" variant="outline" className="shrink-0">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </form>

            {debouncedSearchTerm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Buscando entre usuarios activos: &quot;{debouncedSearchTerm}&quot;
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <Card className="overflow-hidden">
          <UserTable
            key={refreshKey}
            searchTerm={debouncedSearchTerm}
            onSearchChange={setSearchTerm}
          />
        </Card>
      </div>
    </div>
  );
}
