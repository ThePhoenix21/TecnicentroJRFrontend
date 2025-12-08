"use client";

import { useState, useEffect } from "react";
import { storeService } from "@/services/store.service";
import { type Store, type CreateStoreDto, type UpdateStoreDto } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building, Mail, Lock, MapPin, Phone, User } from "lucide-react";

interface StoreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreSaved: () => void;
  editingStore?: Store | null;
}

export function StoreForm({ isOpen, onClose, onStoreSaved, editingStore }: StoreFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingStore) {
      setFormData({
        name: editingStore.name,
        address: editingStore.address || "",
        phone: editingStore.phone || "",
        adminEmail: "",
        adminPassword: "",
      });
    } else {
      setFormData({
        name: "",
        address: "",
        phone: "",
        adminEmail: "",
        adminPassword: "",
      });
    }
    setErrors({});
  }, [editingStore, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre de la tienda es requerido";
    }

    // Solo validar credenciales al crear, no al editar
    if (!editingStore) {
      if (!formData.adminEmail.trim()) {
        newErrors.adminEmail = "El correo del administrador es requerido";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        newErrors.adminEmail = "El correo electrónico no es válido";
      }

      if (!formData.adminPassword.trim()) {
        newErrors.adminPassword = "La contraseña del administrador es requerida";
      } else if (formData.adminPassword.length < 6) {
        newErrors.adminPassword = "La contraseña debe tener al menos 6 caracteres";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (editingStore) {
        const updateData: UpdateStoreDto = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        };

        await storeService.updateStore(editingStore.id, updateData);
        toast.success("Tienda actualizada exitosamente");
      } else {
        const createData: CreateStoreDto = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
        };

        await storeService.createStore(createData);
        toast.success("Tienda creada exitosamente");
      }

      onStoreSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la tienda");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {editingStore ? "Editar Tienda" : "Nueva Tienda"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Nombre de la Tienda *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Ej: Tienda Principal"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Ej: Av. Principal 123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Ej: +123456789"
            />
          </div>

          {!editingStore && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Credenciales del Administrador
              </h3>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo del Administrador *
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange("adminEmail", e.target.value)}
                  placeholder="admin@ejemplo.com"
                  className={errors.adminEmail ? "border-red-500" : ""}
                />
                {errors.adminEmail && <p className="text-sm text-red-500">{errors.adminEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña del Administrador *
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => handleInputChange("adminPassword", e.target.value)}
                  placeholder="Contraseña"
                  className={errors.adminPassword ? "border-red-500" : ""}
                />
                {errors.adminPassword && <p className="text-sm text-red-500">{errors.adminPassword}</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              {editingStore ? "Actualizar Tienda" : "Crear Tienda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
