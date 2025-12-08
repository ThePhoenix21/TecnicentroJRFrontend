"use client";

import { useState, useEffect } from "react";
import { storeService } from "@/services/store.service";
import { type Store } from "@/types/store";
import { StoreForm } from "./store-form";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Edit2, MapPin, Phone, Building, Mail } from "lucide-react";
import { toast } from "sonner";

export default function TiendasPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const loadStores = async () => {
    try {
        setLoading(true);
        const data = await storeService.getAllStores();
        setStores(data);
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar las tiendas");
    } finally {
        setLoading(false);
    }
    };

    useEffect(() => {
    loadStores();
    }, []);

    const handleCreateStore = () => {
        setEditingStore(null);
        setIsFormOpen(true);
    };

    const handleEditStore = (store: Store) => {
        setEditingStore(store);
        setIsFormOpen(true);
    };

    const handleStoreSaved = () => {
        setIsFormOpen(false);
        setEditingStore(null);
        loadStores();
    };

    const filteredStores = stores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.createdBy?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Tiendas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestiona las tiendas del sistema
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button 
                  onClick={handleCreateStore}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-medium">Nueva Tienda</span>
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="w-full">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tiendas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "No se encontraron tiendas que coincidan con la búsqueda" : "No hay tiendas registradas"}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateStore} className="mt-4">
                  Crear primera tienda
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Fecha de creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>
                          {store.address ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {store.address}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin dirección</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {store.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin teléfono</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.createdBy ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{store.createdBy.name}</div>
                                <div className="text-sm text-gray-500">{store.createdBy.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Desconocido</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(store.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStore(store)}
                            className="flex items-center gap-1"
                          >
                            <Edit2 className="h-4 w-4" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <StoreForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStore(null);
        }}
        onStoreSaved={handleStoreSaved}
        editingStore={editingStore}
      />
    </div>
  );
}
