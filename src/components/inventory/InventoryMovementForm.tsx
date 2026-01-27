"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { storeProductService } from "@/services/store-product.service";
import { inventoryService } from "@/services/inventory.service";
import { StoreProductStockItem } from "@/types/store-product.types";
import { InventoryMovementType } from "@/types/inventory.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search } from "lucide-react";

interface InventoryMovementFormProps {
  onSuccess?: () => void;
}

export function InventoryMovementForm({ onSuccess }: InventoryMovementFormProps) {
  const { currentStore, user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<StoreProductStockItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productQuery, setProductQuery] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [type, setType] = useState<InventoryMovementType>("INCOMING");
  const [quantity, setQuantity] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (currentStore?.id) {
      loadProducts(currentStore.id);
    }
  }, [currentStore?.id]);

  const loadProducts = async (storeId: string) => {
    setIsLoadingProducts(true);
    try {
      const response = await storeProductService.getStoreProductsStock(storeId);
      const normalized = (response || []).map((item) => ({
        ...item,
        storeProductId: item.id,
      }));
      setProducts(normalized);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos de la tienda.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId || !quantity || !type) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity);
    
    // Validación de cantidad
    if (isNaN(qty) || qty === 0) {
      toast({
        title: "Error",
        description: "La cantidad no puede ser 0.",
        variant: "destructive",
      });
      return;
    }

    // Para INCOMING y OUTGOING debe ser positivo
    if ((type === 'INCOMING' || type === 'OUTGOING') && qty < 0) {
      toast({
        title: "Error",
        description: "Para entradas y salidas la cantidad debe ser positiva.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'ADJUST' && !isAdmin) {
        toast({
            title: "Acceso denegado",
            description: "Solo los administradores pueden realizar ajustes de inventario.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.createMovimiento({
        storeProductId: selectedProductId,
        type,
        quantity: qty,
        description: description || undefined,
      });

      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha guardado correctamente.",
      });

      // Reset form
      setSelectedProductId("");
      setQuantity("");
      setDescription("");
      setType("INCOMING");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating movement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el movimiento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.storeProductId === selectedProductId);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productQuery.trim().toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Movimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <Select 
                value={type} 
                onValueChange={(val) => setType(val as InventoryMovementType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOMING">Entrada (Compra/Devolución)</SelectItem>
                <SelectItem value="OUTGOING">Salida (Consumo/Pérdida)</SelectItem>
                {isAdmin && (
                  <SelectItem value="ADJUST">Ajuste (Corrección)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Producto</Label>
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setShowProductSuggestions(true);
                  if (!e.target.value) {
                    setSelectedProductId("");
                  }
                }}
                onFocus={() => setShowProductSuggestions(true)}
                placeholder={isLoadingProducts ? "Cargando..." : "Buscar producto"}
                disabled={isLoadingProducts}
                className="pl-8"
              />
              {productQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setProductQuery("");
                    setSelectedProductId("");
                    setShowProductSuggestions(false);
                  }}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}

              {showProductSuggestions && (
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow">
                  <div className="max-h-64 overflow-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        {productQuery ? "No se encontraron productos" : "Sin productos disponibles"}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.storeProductId || product.id}
                          type="button"
                          onClick={() => {
                            const productId = product.storeProductId || product.id;
                            if (!productId) return;
                            setSelectedProductId(productId);
                            setProductQuery(product.name);
                            setShowProductSuggestions(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                        >
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stock actual: <span className="font-medium">{selectedProduct.stock}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={type === 'ADJUST' ? undefined : "1"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === 'ADJUST' ? "Ej: -5 (restar) o 5 (sumar)" : "Ej: 10"}
            />
            {type === 'ADJUST' && (
                <p className="text-xs text-muted-foreground">
                    Use valores negativos para reducir stock y positivos para aumentar.
                </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descripción (Opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Reposición de mercadería"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Registrar Movimiento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
