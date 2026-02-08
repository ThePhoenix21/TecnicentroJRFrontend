"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Product } from "@/types/product.types";
import type { SaleData } from '@/types/sale.types';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  XCircle,
  Info,
  Printer,
  Download,
  AlertCircle,
} from "lucide-react";
import { uploadImages } from "@/lib/api/imageService";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { toast } from "sonner";
import { PDFViewer, pdf, PDFDownloadLink, PDFDownloadLinkProps } from "@react-pdf/renderer";
import ReceiptThermalPDF from './ReceiptThermalPDF';
import { clientService } from '@/services/client.service';
import { cashSessionService } from "@/services/cash-session.service";
import { orderService } from "@/services/order.service";
import { formatCurrency } from "@/lib/utils";

// Definir el tipo para los props del PDFDownloadLink
type PDFDownloadLinkRenderProps = {
  loading: boolean;
  error: Error | null;
  blob: Blob | null;
  url: string | null;
};

// Enum para métodos de pago
enum PaymentType {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  DATAPHONE = 'DATAPHONE',
  BIZUM = 'BIZUM',
  OTRO = 'OTRO'
}

type PaymentTypeValue = (typeof PaymentType)[keyof typeof PaymentType];

// Tipo para método de pago individual
type PaymentMethod = {
  id: string;
  type: PaymentTypeValue;
  amount: number;
};

// Definir el tipo para los datos de la venta
type ReceiptData = {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customer: {
    documentNumber: string;
    documentType: 'dni' | 'ruc' | 'ci' | 'other';
    phone: string;
    email: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    type: 'product' | 'service';
    notes?: string;
  }>;
  subtotal: number;
  total: number;
  paymentMethod?: string;
  paymentReference?: string;
  createdBy?: {
    name: string;
    email?: string;
  };
};

import { StyleSheet, Font, Image as PDFImage } from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import { Order } from "@/services/order.service";
import { PaymentConfirmationDialog } from "@/components/ui/payment-confirmation-dialog";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "service";
  notes?: string;
  images?: File[];
  serviceType?: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS'; // Added service type field
  // Add these to match ProductOrder
  productId?: string;
  storeProductId?: string; // ID del store-product para enviar al backend
  unitPrice?: number;
  customPrice?: number; // Precio personalizado para el producto
  paymentMethods: PaymentMethod[]; // Métodos de pago para el ítem
};

interface NewItemForm {
  id: string;
  type: "product" | "service" | "";
  name: string;
  price: string;
  quantity: string;
  notes: string;
  images: File[];
  serviceType?: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS'; // Added service type field
  // Add these to match ProductOrder
  productId?: string;
  unitPrice?: number;
  paymentMethods: PaymentMethod[]; // Métodos de pago para el ítem
};

type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Tipos para la estructura de la venta
// Types moved to sale.service.ts


// Mantenemos el tipo CartItem para el estado del carrito

type SaleFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SaleData) => Promise<{ success: boolean; orderId?: string; orderNumber?: string; orderData?: any }>;
  products: Product[];
  services?: Service[];
};

export function SaleForm({
  isOpen,
  onClose,
  onSubmit,
  products,
  services,
}: SaleFormProps) {
  const { currentStore, tenantFeatures, tenantFeaturesLoaded, tenantDefaultService, tenantDefaultServiceLoaded, canIssuePdf } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [editedProductPrices, setEditedProductPrices] = useState<Record<string, string>>({});
  const [isOrderPaymentsModalOpen, setIsOrderPaymentsModalOpen] = useState(false);
  const [orderPaymentMethods, setOrderPaymentMethods] = useState<PaymentMethod[]>([
    { id: "1", type: PaymentType.EFECTIVO, amount: 0 },
  ]);
  const [orderPaymentMethodsDraft, setOrderPaymentMethodsDraft] = useState<PaymentMethod[]>([
    { id: "1", type: PaymentType.EFECTIVO, amount: 0 },
  ]);
  const [showServiceSheet, setShowServiceSheet] = useState(false); // Para la hoja de servicio
  const [isDniValid, setIsDniValid] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [documentNumberChangedManually, setDocumentNumberChangedManually] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentCashSession, setCurrentCashSession] = useState<string | null>(null);
  const [isLoadingCashSession, setIsLoadingCashSession] = useState(false);

  const normalizedTenantFeatures = (tenantFeatures || []).map((f) => String(f).toUpperCase());
  const hasSalesOfProducts = normalizedTenantFeatures.includes('SALESOFPRODUCTS');
  const hasSalesOfServices = normalizedTenantFeatures.includes('SALESOFSERVICES');
  const hasSalesFeatureGate = hasSalesOfProducts || hasSalesOfServices;
  const hasGenericClient = normalizedTenantFeatures.includes('GENERICCLIENT');
  const hasImageUpload = normalizedTenantFeatures.includes('IMAGEUPLOAD');

  const canSellProducts = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfProducts;
  const canSellServices = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfServices;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);
  const pendingPrintWindowRef = useRef<Window | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderResponse, setOrderResponse] = useState<any>(null);
  // Estados para el seguimiento de carga de imágenes
  const [uploadStatus, setUploadStatus] = useState<{
    inProgress: boolean;
    progress: number;
    error: string | null;
    uploadedFiles: string[];
    failedFiles: { file: File; error: string }[];
  }>({
    inProgress: false,
    progress: 0,
    error: null,
    uploadedFiles: [],
    failedFiles: [],
  });

  const [showUploadError, setShowUploadError] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);

  // Estado para manejar errores de creación de orden
  const [orderError, setOrderError] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  // Estado para el modal de confirmación de pago
  const [paymentConfirmation, setPaymentConfirmation] = useState<{
    isOpen: boolean;
    itemName: string;
    expectedTotal: number;
    paymentTotal: number;
    pendingItem: {
      item: Pick<CartItem, "id" | "name" | "price"> & {
        productId?: string;
        customPrice?: number;
      };
      type: CartItem["type"];
      notes: string;
      quantity: number;
      images: File[];
      serviceType?: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';
      customPrice?: number;
      paymentMethods: PaymentMethod[];
    } | null;
  }>({
    isOpen: false,
    itemName: "",
    expectedTotal: 0,
    paymentTotal: 0,
    pendingItem: null,
  });

  // Obtener información del usuario autenticado
  const { user } = useAuth();

  const [newItem, setNewItem] = useState<NewItemForm>({
    id: "",
    type: canSellProducts ? "product" : canSellServices ? "service" : "",
    name: "",
    price: "",
    quantity: "1",
    notes: "",
    images: [],
    serviceType: tenantDefaultServiceLoaded ? tenantDefaultService : undefined,
    productId: "",
    unitPrice: 0,
    paymentMethods: [{
      id: "1",
      type: PaymentType.EFECTIVO,
      amount: 0
    }]
  });

  // Lock type selection when there are items in cart
  const isTypeLocked = selectedItems.length > 0;

  useEffect(() => {
    if (!tenantFeaturesLoaded) return;
    if (!hasSalesFeatureGate) return;

    const nextType = canSellProducts && !canSellServices
      ? 'product'
      : canSellServices && !canSellProducts
        ? 'service'
        : null;

    setNewItem((prev) => {
      const isCurrentTypeBlocked =
        (prev.type === 'product' && !canSellProducts) ||
        (prev.type === 'service' && !canSellServices);

      if (!isCurrentTypeBlocked && !nextType) return prev;

      const typeToUse = (nextType ?? prev.type) as NewItemForm['type'];
      if (!typeToUse) return { ...prev, type: '' };

      return {
        ...prev,
        id: "",
        type: typeToUse,
        name: "",
        price: "",
        quantity: "1",
        notes: "",
        serviceType: typeToUse === 'service' ? (tenantDefaultServiceLoaded ? tenantDefaultService : undefined) : undefined,
      };
    });

    setSearchTerm("");
    setIsDropdownOpen(false);
  }, [tenantFeaturesLoaded, hasSalesFeatureGate, canSellProducts, canSellServices]);

  useEffect(() => {
    if (!tenantDefaultServiceLoaded) return;
    if (newItem.type !== 'service') return;
    if (newItem.serviceType) return;

    setNewItem((prev) => ({
      ...prev,
      serviceType: tenantDefaultService,
    }));
  }, [tenantDefaultService, tenantDefaultServiceLoaded, newItem.type, newItem.serviceType]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setNewItem((prev) => {
      const existingFiles = prev.images || [];
      const newFiles = acceptedFiles.filter(
        (newFile) =>
          !existingFiles.some(
            (existingFile) =>
              existingFile.name === newFile.name &&
              existingFile.size === newFile.size
          )
      );

      return {
        ...prev,
        images: [...existingFiles, ...newFiles],
      };
    });
  }, []); // No necesita dependencias ya que solo usa setNewItem

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  const removeImage = (index: number) => {
    setNewItem((prev) => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  interface FormCustomerData {
    name: string;
    phone: string;
    documentNumber: string;
    documentType?: string;
    email: string;
    address: string;
    ruc?: string; // Added RUC field
    notes: string;
  }

  const [customerData, setCustomerData] = useState<FormCustomerData>({
    name: "",
    phone: "",
    documentNumber: "",
    documentType: "dni",
    email: "",
    address: "",
    ruc: "",
    notes: "",
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    documentNumber?: string;
  }>({});

  const validateForm = (): boolean => {
    if (hasGenericClient) {
      setErrors({});
      return true;
    }

    const newErrors: typeof errors = {};
    let isValid = true;

    // Verificar si hay servicios en la venta
    const hasServices = selectedItems.some((item) => item.type === "service");
    const hasProducts = selectedItems.some((item) => item.type === "product");

    // Validar campos del cliente si hay servicios o productos
    if (hasServices || hasProducts) {
      // Validaciones comunes para todos los tipos
      // Validar formato de email si tiene contenido
      if (customerData.email?.trim() && !/\S+@\S+\.\S+/.test(customerData.email)) {
        newErrors.email = "El correo electrónico no es válido";
        isValid = false;
      }

      // Validar formato de teléfono si tiene contenido
      if (customerData.phone?.trim() && !/^[0-9+\-\s]+$/.test(customerData.phone)) {
        newErrors.phone =
          "El teléfono solo puede contener números, guiones y espacios";
        isValid = false;
      }

      // Validar DNI si hay servicios (opcional; si se ingresa debe ser válido) o si se completó (formato)
      if (hasServices) {
        // Para servicios, DNI es opcional; si se ingresa debe ser válido
        if (customerData.documentNumber?.trim() && !/^[0-9]{8}$/.test(customerData.documentNumber)) {
          newErrors.documentNumber = "El DNI debe tener 8 dígitos";
          isValid = false;
        }
      } else if (hasProducts && customerData.documentNumber?.trim()) {
        // Para productos, DNI es opcional pero si se ingresa debe ser válido
        if (!/^[0-9]{8}$/.test(customerData.documentNumber)) {
          newErrors.documentNumber = "El DNI debe tener 8 dígitos si se ingresa";
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Reset completo del estado de la venta
  const resetSaleState = useCallback(() => {
    console.log(" Iniciando reset del estado de venta");

    setSelectedItems([]); // Limpiar el carrito
    setCustomerData({
      name: "",
      phone: "",
      documentNumber: "",
      email: "",
      address: "",
      ruc: "",
      notes: "",
    });
    setErrors({}); // Limpiar errores de validación
    setSearchTerm(""); // Limpiar búsqueda
    setIsDropdownOpen(false); // Cerrar dropdown
    setUploadStatus({
      inProgress: false,
      progress: 0,
      error: null,
      uploadedFiles: [],
      failedFiles: [],
    });
    setShowUploadError(false);
    setForceSubmit(false);
    setOrderId(null);
    setOrderNumber(null);
    setOrderError(null); // Limpiar errores de orden
    setOrderResponse(null); // Limpiar respuesta de orden
    hasAutoPrintedRef.current = false;
    // Reset newItem form
    setNewItem({
      id: "",
      type: newItem.type, // Mantener el tipo seleccionado
      name: "",
      price: "",
      quantity: "1",
      notes: "",
      images: [],
      serviceType: tenantDefaultServiceLoaded ? tenantDefaultService : undefined,
      productId: "",
      unitPrice: 0,
      paymentMethods: [{
        id: "1",
        type: PaymentType.EFECTIVO,
        amount: 0
      }]
    });

    console.log("✅ Estado de venta reseteado completamente");
  }, []);

  // Efecto para cargar la sesión de caja activa cuando se abre el formulario o cambia la tienda
  useEffect(() => {
    if (isOpen && currentStore?.id) {
      loadActiveCashSession();
    }
  }, [isOpen, currentStore?.id]);

  // Función para cargar la sesión de caja activa
  const loadActiveCashSession = async () => {
    if (!currentStore?.id) return;
    
    setIsLoadingCashSession(true);
    try {
      console.log('🔍 Buscando sesión de caja abierta para la tienda:', currentStore.id);
      const openSession = await cashSessionService.getOpenCashSession(currentStore.id);
      
      if (openSession) {
        setCurrentCashSession(openSession.id);
        console.log('✅ Sesión de caja abierta encontrada:', openSession.id);
      } else {
        setCurrentCashSession(null);
        console.log('⚠️ No hay sesión de caja abierta para esta tienda');
        toast.warning('No hay una sesión de caja abierta. Debe abrir una sesión de caja antes de crear ventas.');
      }
    } catch (error) {
      console.error('❌ Error al cargar sesión de caja abierta:', error);
      setCurrentCashSession(null);
      toast.error('Error al verificar la sesión de caja');
    } finally {
      setIsLoadingCashSession(false);
    }
  };

  // Limpiar estado cuando se abre una nueva venta
  useEffect(() => {
    if (isOpen) {
      console.log(" Nueva venta abierta - limpiando estado anterior");
      resetSaleState();
      setShowUploadError(false);
    }
  }, [isOpen, resetSaleState]);

  const filteredItems = (): (Product | Service)[] => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();

    // Filtrar según el tipo actual
    let itemsToSearch: (Product | Service)[] = [];

    if (newItem.type === "product") {
      itemsToSearch = products;
    } else if (newItem.type === "service") {
      itemsToSearch = services || [];
    }

    return itemsToSearch.filter((item) => {
      const isProduct = "stock" in item;
      const description = isProduct ? (item as Product).description : null;

      return (
        item.name.toLowerCase().includes(term) ||
        (description && (description as string).toLowerCase().includes(term)) ||
        item.id.toLowerCase().includes(term)
      );
    });
  };

  // Manejar selección de ítem
  const handleItemSelect = (item: Product | Service) => {
    setNewItem((prev) => {
      const updated = {
        ...prev,
        id: item.id,
        name: item.name,
        price: item.price.toString(),
      };
      
      // Si es un producto, configurar payment automático de EFECTIVO
      if ("stock" in item) { // Es un producto
        updated.paymentMethods = [{
          id: "1",
          type: PaymentType.EFECTIVO,
          amount: item.price
        }];
      }
      
      return updated;
    });
    setSearchTerm(""); // Limpiar búsqueda
    setIsDropdownOpen(false);
  };

  // Manejar foco en el campo de búsqueda
  const handleFocus = () => {
    if (newItem.type === "product") {
      setSearchTerm(newItem.name);
      setIsDropdownOpen(!!newItem.name);
    }
  };

  // Funciones para manejar métodos de pago
  const addOrderPaymentMethod = () => {
    setOrderPaymentMethodsDraft((prev) => ([
      ...prev,
      {
        id: Date.now().toString(),
        type: PaymentType.EFECTIVO,
        amount: 0,
      },
    ]));
  };

  const removeOrderPaymentMethod = (id: string) => {
    setOrderPaymentMethodsDraft((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((pm) => pm.id !== id);
    });
  };

  const updateOrderPaymentMethod = (
    id: string,
    field: "type" | "amount",
    value: PaymentTypeValue | number
  ) => {
    setOrderPaymentMethodsDraft((prev) =>
      prev.map((pm) => (pm.id === id ? { ...pm, [field]: value } : pm))
    );
  };

  // Eliminar ítem del carrito
  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Manejar cambios en el formulario
  const handleNewItemChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setNewItem((prev) => {
      const newState = { ...prev, [name]: value };

      // Actualizar búsqueda cuando cambia el nombre y es un producto
      if (name === "name" && prev.type === "product") {
        setSearchTerm(value);
      }

      if (name === "type") {
        // Resetear otros campos cuando cambia el tipo
        newState.name = "";
        newState.price = "";
        newState.quantity = "1";
        newState.notes = "";
        newState.serviceType = value === 'service' ? (tenantDefaultServiceLoaded ? tenantDefaultService : undefined) : undefined;
        setSearchTerm("");
      }

      if (name === "quantity" && type === "number") {
        const parsedQuantity = parseInt(value);

        // Asegurar que la cantidad mínima sea 1
        newState.quantity = isNaN(parsedQuantity) || parsedQuantity < 1
          ? "1"
          : parsedQuantity.toString();

        // Si es un producto, actualizar automáticamente el monto del primer método de pago
        if (prev.type === "product") {
          const effectiveQuantity = parseInt(newState.quantity) || 1;

          // Determinar el precio unitario efectivo: precio personalizado si existe, sino precio base del producto
          let unitPrice = 0;

          if (prev.price) {
            const customPrice = Number(parseFloat(prev.price));
            if (!isNaN(customPrice) && customPrice >= 0) {
              unitPrice = customPrice;
            }
          }

          if (unitPrice === 0) {
            const product = products.find((p) => p.id === prev.id);
            if (product) {
              unitPrice = product.price;
            }
          }

          if (unitPrice > 0 && newState.paymentMethods && newState.paymentMethods.length > 0) {
            const total = unitPrice * effectiveQuantity;

            newState.paymentMethods = newState.paymentMethods.map((pm, index) =>
              index === 0
                ? { ...pm, amount: total }
                : pm
            );
          }
        }
      }

      if (name === "name" && prev.type === "product") {
        setIsDropdownOpen(!!value);
        
        // Si es un producto y se encuentra en la lista, configurar payment automático
        const product = products.find((p) => p.id === value);
        if (product && prev.paymentMethods.length === 1 && prev.paymentMethods[0].amount === 0) {
          newState.paymentMethods = [{
            id: "1",
            type: PaymentType.EFECTIVO,
            amount: product.price
          }];
        }
      }

      return newState;
    });
  };

  // Agregar ítem personalizado
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.type || !newItem.price) return;

    if (newItem.type === 'product' && !newItem.name) return;

    const canSellProducts = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfProducts;
    const canSellServices = !tenantFeaturesLoaded || !hasSalesFeatureGate || hasSalesOfServices;

    if (newItem.type === 'product' && !canSellProducts) {
      toast.error('Tu plan no permite vender productos');
      return;
    }

    if (newItem.type === 'service' && !canSellServices) {
      toast.error('Tu plan no permite vender servicios');
      return;
    }

    const quantity = Math.max(
      1,
      isNaN(parseInt(newItem.quantity as string, 10)) ? 1 : parseInt(newItem.quantity as string, 10)
    );

    const price = Number(parseFloat(newItem.price)) || 0;
    const images = newItem.images || [];
    const notes = newItem.notes || "";

    // Para servicios, la cantidad siempre debe ser 1
    const finalQuantity = newItem.type === "service" ? 1 : quantity;

    // Calcular total esperado y total de métodos de pago
    const expectedTotal = price * finalQuantity;
    const paymentTotal = newItem.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);

    // Para servicios, los métodos de pago son opcionales - no mostrar modal de confirmación
    if (newItem.type === "service") {
      // Para servicios, generamos un ID temporal
      const serviceId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      handleAddItem(
        {
          id: serviceId,
          name: newItem.name?.trim() || 'Defauld_Service',
          price: price,
        },
        "service",
        notes,
        finalQuantity,
        images,
        newItem.serviceType || (tenantDefaultServiceLoaded ? tenantDefaultService : "REPAIR"),
        undefined,
        newItem.paymentMethods // Pasar métodos de pago del formulario (pueden estar vacíos)
      );

      // Reiniciar formulario
      setNewItem({
        id: "",
        type: newItem.type, // Mantener el tipo seleccionado
        name: "",
        price: "",
        quantity: "1",
        notes: "",
        images: [],
        serviceType: tenantDefaultServiceLoaded ? tenantDefaultService : undefined,
        productId: "",
        unitPrice: 0,
        paymentMethods: [{
          id: "1",
          type: PaymentType.EFECTIVO,
          amount: 0
        }]
      });
      return;
    }

    // Si los montos no coinciden, mostrar modal de confirmación (solo para productos)
    if (expectedTotal !== paymentTotal) {
      // Preparar el ítem pendiente para confirmación
      let pendingItem;
      
      if (newItem.type === "product") {
        const product = products.find((p) => p.id === newItem.id);
        if (!product) return;
        
        pendingItem = {
          item: {
            id: product.id,
            name: product.name,
            price: product.price,
          },
          type: "product" as const,
          notes,
          quantity,
          images: [],
          customPrice: price > 0 ? price : undefined,
          paymentMethods: newItem.paymentMethods,
        };
      } else {
        return;
      }

      // Mostrar modal de confirmación
      setPaymentConfirmation({
        isOpen: true,
        itemName: newItem.name,
        expectedTotal,
        paymentTotal,
        pendingItem,
      });
      
      return; // No continuar con el agregado hasta confirmar
    }

    // Si los montos coinciden, agregar directamente
    if (newItem.type === "product") {
      // Para productos, necesitamos el ID del producto
      const product = products.find((p) => p.id === newItem.id);
      if (!product) return;

      // Usar el precio personalizado si se ingresó, de lo contrario usar el precio del producto
      const finalPrice = price > 0 ? price : product.price;
      
      handleAddItem(
        {
          id: product.id,
          name: product.name,
          price: product.price, // Mantener el precio original
          customPrice: finalPrice, // Usar el precio personalizado
          productId: product.storeProductId || product.id, // Guardar storeProductId si existe
        } as CartItem, // Cast a CartItem para permitir storeProductId
        "product",
        notes,
        quantity,
        [],
        undefined,
        undefined,
        newItem.paymentMethods // Pasar métodos de pago del formulario
      );
    } else {
      return;
    }

    // Reiniciar formulario
    setNewItem({
      id: "",
      type: newItem.type, // Mantener el tipo seleccionado
      name: "",
      price: "",
      quantity: "1",
      notes: "",
      images: [],
      serviceType: tenantDefaultServiceLoaded ? tenantDefaultService : undefined,
      productId: "",
      unitPrice: 0,
      paymentMethods: [{
        id: "1",
        type: PaymentType.EFECTIVO,
        amount: 0
      }]
    });
  };

  // Agregar ítem al carrito
  const handleAddItem = (
    item: Pick<CartItem, "id" | "name" | "price"> & {
      productId?: string;
      customPrice?: number; // Precio personalizado para el producto
    },
    type: CartItem["type"],
    notes: string = "",
    quantity: number = 1,
    images: File[] = [],
    serviceType?: 'REPAIR' | 'WARRANTY' | 'MISELANEOUS', // Added serviceType parameter
    customPrice?: number, // Precio personalizado opcional
    paymentMethods: PaymentMethod[] = [] // Métodos de pago del formulario
  ): void => {
    setSelectedItems((prev: CartItem[]): CartItem[] => {
      const existingItem = prev.find((i: CartItem) => {
        if (type === "product") {
          return i.id === item.id && i.type === type;
        } else if (type === "service") {
          return (
            i.name.toLowerCase() === item.name.toLowerCase() && i.type === type
          );
        }
        return false;
      });

      const quantityToAdd = Math.max(
        1,
        isNaN(quantity) ? 1 : quantity
      );

      if (existingItem) {
        return prev.map((i: CartItem) => {
          const isSameItem =
            type === "product"
              ? i.id === item.id && i.type === type
              : i.name.toLowerCase() === item.name.toLowerCase() &&
                i.type === type;

          if (!isSameItem) return i;

          const updatedItem = {
            ...i,
            quantity: i.quantity + quantityToAdd,
            notes: type === "service" ? notes || i.notes || "" : i.notes,
            paymentMethods: paymentMethods, // Usar el parámetro paymentMethods
          };

          if (type === "service" && images.length > 0) {
            // Safe type assertion since we know this is a service item
            const serviceItem = updatedItem as CartItem & { images: File[] };
            serviceItem.images = [...(i.images || []), ...images];
          }

          // Update serviceType if this is a service
          if (type === "service") {
            (updatedItem as CartItem & { serviceType: string }).serviceType = serviceType || (tenantDefaultServiceLoaded ? tenantDefaultService : "REPAIR");
          }

          return updatedItem as CartItem;
        });
      }

      // Determinar el precio a usar: customPrice si está definido, de lo contrario usar el precio base del producto
      const finalPrice = customPrice !== undefined ? customPrice : item.price;

      const cartItem: CartItem = {
        ...item,
        id: item.id || `temp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        price: Number(item.price), // Mantener siempre el precio original
        quantity: quantityToAdd,
        type,
        notes: type === "service" ? notes : "",
        paymentMethods: paymentMethods, // Usar el parámetro paymentMethods
        ...(type === "product" && {
          productId: item.productId || item.id,
          storeProductId: item.productId || item.id,
          // Guardar el precio personalizado si es diferente al precio base
          ...(customPrice !== undefined && customPrice > 0 && Number(customPrice) !== Number(item.price) && {
            customPrice: Number(customPrice)
          })
        }),
        ...(type === "service" && { images }),
        ...(type === "service" && { serviceType: serviceType || (tenantDefaultServiceLoaded ? tenantDefaultService : "REPAIR") }),
      } as CartItem;

      return [...prev, cartItem];
    });
  };

  // Funciones para manejar la confirmación del modal de pago
  const handlePaymentConfirmation = () => {
    if (!paymentConfirmation.pendingItem) return;

    const { pendingItem } = paymentConfirmation;
    
    // Usar el total de métodos de pago como precio confirmado
    const confirmedPrice = paymentConfirmation.paymentTotal;

    // Agregar el ítem con el precio confirmado
    if (pendingItem.type === "product") {
      const product = products.find((p) => p.id === pendingItem.item.id);
      handleAddItem(
        {
          ...pendingItem.item,
          price: pendingItem.item.price, // Mantener precio original
          customPrice: confirmedPrice, // Usar precio confirmado
          productId: product?.storeProductId || product?.id,
          storeProductId: product?.storeProductId || product?.id,
        } as CartItem, // Cast a CartItem para permitir storeProductId
        pendingItem.type,
        pendingItem.notes,
        pendingItem.quantity,
        pendingItem.images,
        undefined,
        confirmedPrice, // Precio personalizado confirmado
        pendingItem.paymentMethods
      );
    } else {
      return;
    }

    // Cerrar modal y reiniciar formulario
    setPaymentConfirmation({
      isOpen: false,
      itemName: "",
      expectedTotal: 0,
      paymentTotal: 0,
      pendingItem: null,
    });

    // Reiniciar formulario del nuevo ítem
    setNewItem({
      id: "",
      type: newItem.type, // Mantener el tipo seleccionado
      name: "",
      price: "",
      quantity: "1",
      notes: "",
      images: [],
      serviceType: tenantDefaultServiceLoaded ? tenantDefaultService : undefined,
      productId: "",
      unitPrice: 0,
      paymentMethods: [{
        id: "1",
        type: PaymentType.EFECTIVO,
        amount: 0
      }]
    });
  };

  const handlePaymentCancel = () => {
    // Cerrar modal sin agregar el ítem
    setPaymentConfirmation({
      isOpen: false,
      itemName: "",
      expectedTotal: 0,
      paymentTotal: 0,
      pendingItem: null,
    });
  };

  // Datos por defecto del cliente para ventas solo con productos
  const defaultClientInfo = {
    name: "venta",
    email: "venta_cliente@example.com",
    phone: "",
    address: "Calle Falsa 123",
    dni: "00000000",
  };

  // Manejar envío del formulario
  const handleSubmit = async (paymentMethodsOverride?: PaymentMethod[], printWindow?: Window | null) => {
    console.log('[SaleForm][debug] handleSubmit invoked - hasOverride:', !!paymentMethodsOverride, 'isOrderPaymentsModalOpen:', isOrderPaymentsModalOpen);
    console.trace('[SaleForm][debug] handleSubmit call stack');

    if (!paymentMethodsOverride) {
      setIsOrderPaymentsModalOpen(true);
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("No hay ítems en la venta");
      return;
    }

    // Verificar si hay servicios o productos en la venta
    const hasServices = selectedItems.some((item) => item.type === "service");
    const hasProducts = selectedItems.some((item) => item.type === "product");
    const isServiceOnlySale = hasServices && !hasProducts;

    // Si hay servicios o productos, validar formulario
    if (hasServices || hasProducts) {
      if (!validateForm()) {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.focus();
        }
        return;
      }
    }

    try {
      // Limpiar errores previos
      setOrderError(null);

      // Iniciar estado de carga
      setUploadStatus((prev) => ({
        ...prev,
        inProgress: true,
        progress: 0,
        error: null,
        failedFiles: [],
      }));

      // Procesar productos
      const productsData = selectedItems
        .filter((item) => item.type === "product")
        .map((item) => {
          const hasCustomPrice = item.customPrice !== undefined && Number(item.customPrice) > 0 && Number(item.customPrice) !== Number(item.price);
          const finalPrice = hasCustomPrice ? Number(item.customPrice) : Number(item.price);
          
          // Usar los métodos de pago del formulario
          const payments = item.paymentMethods.map(pm => ({
            type: pm.type,
            amount: pm.amount
          }));

          return {
            productId: item.storeProductId || item.productId || item.id, // Usar storeProductId si existe
            quantity: item.quantity,
            ...(hasCustomPrice ? { customPrice: finalPrice } : { price: Number(item.price) }),
            payments
          };
        });

      console.log("Productos procesados:", productsData);

      // Procesar servicios
      const servicesData = await Promise.all(
        selectedItems
          .filter((item) => item.type === "service")
          .map(async (item) => {
            let photoUrls: string[] = [];
            if (hasImageUpload && item.images?.length) {
              const result = await uploadImages(item.images, ({ total, completed }) => {
                setUploadStatus((prev) => ({ ...prev, progress: Math.round((completed / total) * 100) }));
              });
              if (result.failed.length > 0 && !forceSubmit) {
                setUploadStatus((prev) => ({ ...prev, error: `No se pudieron cargar ${result.failed.length} imágenes`, failedFiles: result.failed }));
                setShowUploadError(true);
                throw new Error("Error al subir imágenes");
              }
              photoUrls = result.urls;
            }

            // Usar los métodos de pago del formulario
            const payments = item.paymentMethods.map(pm => ({
              type: pm.type,
              amount: pm.amount
            }));

            return {
              name: item.name?.trim() || 'Defauld_Service',              
              price: Number(typeof item.price === "string" ? parseFloat(item.price) : item.price),
              type: (item.serviceType || (tenantDefaultServiceLoaded ? tenantDefaultService : "REPAIR")),
              description: item.notes,
              photoUrls,
              payments
            };
          })
      );

      // Validar que haya al menos un producto o servicio
      if (productsData.length === 0 && servicesData.length === 0) {
        toast.error("La venta debe incluir al menos un producto o servicio válido");
        return;
      }

      // Generar DNI único para ventas de productos si no se ingresó
      let finalDni = customerData.documentNumber?.trim();
      if (!finalDni && hasProducts && !hasServices) {
        // Usar DNI por defecto fijo ya que no hay colisiones en el backend
        finalDni = "00000000";
      }

      // Usar los datos del cliente si hay servicios o productos, de lo contrario usar los valores por defecto
      const clientInfo = hasGenericClient
        ? defaultClientInfo
        : (hasServices || hasProducts)
          ? {
            name: customerData.name || (hasServices ? "Venta" : "Cliente"),
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address || (hasServices ? "Venta" : "Sin dirección"),
            dni: finalDni || "00000000",
            ...(customerData.ruc && { ruc: customerData.ruc }),
          }
          : defaultClientInfo;

      console.log("existe productsData:", productsData);

      const orderPaymentMethodsToUse = (paymentMethodsOverride ?? orderPaymentMethods)
        .filter((pm) => Number.isFinite(pm.amount) && pm.amount >= 0)
        .filter((pm) => (isServiceOnlySale ? true : pm.amount > 0))
        .map((pm) => ({
          type: pm.type,
          amount: pm.amount,
        }));

      if (orderPaymentMethodsToUse.length === 0) {
        toast.error("Debe registrar al menos un método de pago");
        return;
      }

      const totalAmount = Number(orderPaymentMethodsToUse.reduce((sum, pm) => sum + pm.amount, 0));

      // Validar que haya una sesión de caja activa
      if (!currentCashSession) {
        toast.error('No hay una sesión de caja activa. Debe abrir una sesión de caja antes de crear ventas.');
        return;
      }

      const saleData = {
        clientInfo,
        products: productsData,
        services: servicesData,
        paymentMethods: orderPaymentMethodsToUse,
        totalAmount, // Agregar el monto total confirmado
        cashSessionId: currentCashSession, // Usar sesión de caja real
      };

      const result = await onSubmit(saleData);

      console.log('[SaleForm][debug] onSubmit result:', result);

      const isSuccess = Boolean((result as any)?.success);
      const resolvedOrderData = (result as any)?.orderData ?? (result as any)?.data ?? result;
      const resolvedOrderId = (result as any)?.orderId ?? (resolvedOrderData as any)?.id ?? (resolvedOrderData as any)?.orderId;
      const resolvedOrderNumber = (result as any)?.orderNumber ?? (resolvedOrderData as any)?.orderNumber;

      console.log('[SaleForm][debug] resolved submit payload:', {
        isSuccess,
        resolvedOrderId,
        resolvedOrderNumber,
        hasResolvedOrderData: !!resolvedOrderData,
      });

      if (isSuccess) {
        setOrderId(resolvedOrderId ?? null);
        setOrderNumber(resolvedOrderNumber || null);

        if (canIssuePdf) {
          const idToFetch = String(resolvedOrderId ?? (resolvedOrderData as any)?.orderId ?? '');
          const details = idToFetch ? await orderService.getOrderDetails(idToFetch) : resolvedOrderData;

          setOrderResponse(details);
          console.log('[SaleForm][debug] opening ServiceSheet PDF modal');
          setShowServiceSheet(true);

          // Cerrar modal de nueva venta (dejando el comprobante abierto)
          onClose();

          if (!hasAutoPrintedRef.current) {
            hasAutoPrintedRef.current = true;
            // Create print window only after successful sale
            const printWindow = window.open('about:blank', '_blank');
            await printThermalLikeOrderDetailsDialog(details, printWindow);
          }
        } else {
          setOrderResponse(resolvedOrderData);
          resetSaleState();
          onClose();
        }
      }
    } catch (error) {
      // Extraer mensaje de error y código si están disponibles
      let errorMessage = error instanceof Error ? error.message : "Error al registrar la venta";
      let errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;

      // Manejar específicamente el error de email duplicado con DNI diferente
      if (errorMessage.includes('El correo electrónico ya está registrado con un DNI diferente')) {
        errorMessage = 'Este correo electrónico ya está registrado con otro DNI. Por favor, use un correo diferente o verifique el DNI ingresado.';
        errorCode = 'EMAIL_DNI_MISMATCH';
      }
      // Manejar específicamente el error de DNI duplicado
      else if (errorMessage.includes('Unique constraint failed on the fields: (`dni`)') ||
        errorMessage.includes('duplicate key') ||
        errorCode === 'DNI_ALREADY_EXISTS') {
        errorMessage = 'El DNI 00000000 esta reservado para clientes por defecto. Ingrese un DNI diferente o deje el campo vacío para generar uno automáticamente.';
        errorCode = 'DNI_ALREADY_EXISTS';
      }
      // Manejar errores de validación comunes
      else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        errorMessage = 'Por favor, complete todos los campos obligatorios correctamente.';
        errorCode = 'VALIDATION_ERROR';
      }
      // Manejar errores de conexión
      else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        errorMessage = 'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.';
        errorCode = 'CONNECTION_ERROR';
      }

      // Guardar el error en el estado para mostrarlo en la UI
      setOrderError({
        message: errorMessage,
        code: errorCode
      });

      // También mostrar toast para notificación inmediata
      toast.error(errorMessage);
    } finally {
      setUploadStatus((prev) => ({ ...prev, inProgress: false }));
    }
  };

  // Buscar cliente por DNI con useCallback para evitar recreaciones innecesarias
  const searchClientByDni = useCallback(async (dni: string) => {
    if (!dni || dni.length !== 8) {
      console.log('DNI inválido o incompleto');
      return;
    }
    
    console.log('Buscando cliente con DNI:', dni);
    setIsSearchingClient(true);
    
    try {
      const client = await clientService.getClientByDni(dni);
      console.log('Respuesta de getClientByDni:', client);
      
      if (client) {
        console.log('Cliente encontrado, actualizando campos con:', {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          ruc: client.ruc,
          dni: client.dni
        });
        
        // Si encontramos el cliente, actualizamos los campos
        setCustomerData(prev => {
          const newData = {
            ...prev,
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            ruc: client.ruc || '',
            documentNumber: dni,
            // Mantenemos las notas existentes
            notes: prev.notes
          };
          console.log('Nuevos datos del cliente:', newData);
          return newData;
        });
        
        console.log('Cliente encontrado y cargado:', client);
        toast.success('Cliente encontrado y cargado correctamente');
      } else {
        console.log('Cliente no encontrado, limpiando campos excepto DNI');
        
        // Si no encontramos el cliente, limpiamos todos los campos excepto el DNI
        setCustomerData(prev => {
          const newData = {
            ...prev,
            name: '',
            email: '',
            phone: '',
            address: '',
            ruc: '',
            documentNumber: dni, // Mantenemos el DNI ingresado
            // Mantenemos las notas existentes
            notes: prev.notes
          };
          console.log('Datos limpiados (cliente no encontrado):', newData);
          return newData;
        });
        
        console.log('Cliente no encontrado');
        toast.info('Cliente no encontrado. Complete los datos manualmente');
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      toast.error('Error al buscar el cliente. Verifique el DNI e intente nuevamente');
    } finally {
      setIsSearchingClient(false);
      setDocumentNumberChangedManually(false);
    }
  }, []);

  // Efecto para validar DNI y buscar cliente cuando esté completo
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const searchClient = async () => {
      if (!isMounted) return;
      
      const currentDni = customerData.documentNumber;
      
      // Solo buscar si el DNI es válido y no estamos ya buscando
      if (currentDni.length === 8 && !isSearchingClient && documentNumberChangedManually) {
        console.log('Iniciando búsqueda automática de cliente con DNI:', currentDni);
        
        try {
          await searchClientByDni(currentDni);
        } catch (error) {
          console.error('Error en la búsqueda automática:', error);
        }
      }
    };

    // Usamos un pequeño timeout para agrupar múltiples cambios rápidos
    if (customerData.documentNumber.length === 8) {
      timer = setTimeout(() => {
        if (isMounted) {
          searchClient();
        }
      }, 800); // 800ms de retraso para evitar múltiples búsquedas
    }

    // Limpieza
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [customerData.documentNumber, isSearchingClient, searchClientByDni, documentNumberChangedManually]);

  // Efecto para actualizar isDniValid cuando cambia el DNI
  useEffect(() => {
    setIsDniValid(customerData.documentNumber.length === 8);
  }, [customerData.documentNumber]);

  // Renderizar formulario de cliente
  const renderCustomerForm = () => (
    <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="text-xl font-semibold text-foreground">
        Información del Cliente (Opcional)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label 
            htmlFor="name" 
            className="text-foreground/90"
          >
            Nombre completo
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="name"
            value={customerData.name}
            onChange={(e) => {
              setCustomerData({ ...customerData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            placeholder={isDniValid ? "Ej: Juan Pérez" : "Ingrese DNI de 8 dígitos primero"}
            disabled={!isDniValid || isSearchingClient}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="email" 
            className="text-foreground/90"
          >
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            value={customerData.email}
            onChange={(e) => {
              setCustomerData({ ...customerData, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder={isDniValid ? "correo@ejemplo.com" : "Ingrese DNI de 8 dígitos primero"}
            disabled={!isDniValid || isSearchingClient}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1.5">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="phone" 
            className="text-foreground/90"
          >
            Teléfono
          </Label>
          <Input
            id="phone"
            type="tel"
            value={customerData.phone}
            onChange={(e) => {
              setCustomerData({ ...customerData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder={isDniValid ? "+51 999 999 999" : "Ingrese DNI de 8 dígitos primero"}
            disabled={!isDniValid || isSearchingClient}
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1.5">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentNumber" className="text-foreground/90">
            DNI {!isDniValid && <span className="text-muted-foreground text-xs">(8 dígitos)</span>}
            {selectedItems.some((item) => item.type === "service") && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="documentNumber"
              value={customerData.documentNumber}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/\D/g, '');
                const newDocumentNumber = value.slice(0, 8);
                
                // Actualizamos el estado del DNI
                setCustomerData(prev => ({
                  ...prev,
                  documentNumber: newDocumentNumber
                }));
                
                // Marcamos que el usuario está realizando un cambio manual
                setDocumentNumberChangedManually(true);
                
                // Limpiamos el error si existe
                if (errors.documentNumber) {
                  setErrors(prev => ({
                    ...prev,
                    documentNumber: undefined
                  }));
                }
              }}
              placeholder="12345678"
              maxLength={8}
              className={`mt-1 pr-10 ${errors.documentNumber ? "border-destructive" : ""} ${isSearchingClient ? 'opacity-70' : ''}`}
              disabled={isSearchingClient}
              onKeyDown={(e) => {
                // Si presiona Enter y el DNI es válido, forzamos la búsqueda
                if (e.key === 'Enter' && customerData.documentNumber.length === 8) {
                  searchClientByDni(customerData.documentNumber);
                }
              }}
            />
            {isSearchingClient && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
            {customerData.documentNumber.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {customerData.documentNumber.length}/8
              </span>
            )}
          </div>
          {errors.documentNumber ? (
            <p className="text-sm text-destructive">{errors.documentNumber}</p>
          ) : customerData.documentNumber.length > 0 && customerData.documentNumber.length < 8 ? (
            <p className="text-sm text-amber-500 mt-1.5">Ingrese 8 dígitos</p>
          ) : isDniValid ? (
            <p className="text-sm text-green-600 mt-1.5">✓ DNI válido</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="address" 
            className="text-foreground/90"
          >
            Dirección
          </Label>
          <Input
            id="address"
            value={customerData.address}
            onChange={(e) =>
              setCustomerData({ ...customerData, address: e.target.value })
            }
            placeholder={isDniValid ? "Dirección del cliente" : "Ingrese DNI de 8 dígitos primero"}
            disabled={!isDniValid || isSearchingClient}
          />
        </div>

        <div className="space-y-2">
          <Label 
            htmlFor="ruc" 
            className="text-foreground/90"
          >
            RUC (opcional)
          </Label>
          <Input
            id="ruc"
            value={customerData.ruc || ""}
            onChange={(e) =>
              setCustomerData({ ...customerData, ruc: e.target.value })
            }
            placeholder={isDniValid ? "Número de RUC" : "Ingrese DNI de 8 dígitos primero"}
            disabled={!isDniValid || isSearchingClient}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label 
            htmlFor="notes" 
            className="text-foreground/90"
          >
            Notas adicionales
          </Label>
          <textarea
            id="notes"
            value={customerData.notes || ""}
            onChange={(e) =>
              setCustomerData({ ...customerData, notes: e.target.value })
            }
            placeholder={isDniValid ? "Notas adicionales del cliente" : "Ingrese DNI de 8 dígitos primero"}
            className="flex h-24 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 bg-background"
            disabled={!isDniValid || isSearchingClient}
          />
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded-md border border-muted">
          <p className="text-sm text-muted-foreground flex items-center">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              <strong>Información del cliente:</strong> Complete los datos del cliente para un mejor seguimiento de sus ventas.
              {selectedItems.some((item) => item.type === "service") && (
                <span className="block mt-1">
                  <strong>Nota:</strong> El DNI es obligatorio para servicios.
                </span>
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  // Registrar fuentes
  Font.register({
    family: 'Helvetica',
    fonts: [
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
  });

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 10,
      fontFamily: 'Helvetica',
      fontSize: 8,
    },
    receiptContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: 8,
    },
    receipt: {
      marginBottom: 10,
      border: '1px solid #e2e8f0',
      borderRadius: 3,
      padding: 8,
      position: 'relative',
      fontSize: 8,
    },
    logoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    logo: {
      width: '80px',
      height: 'auto',
      marginRight: 10,
    },
    headerInfo: {
      flex: 1,
      marginLeft: 10,
    },
    header: {
      marginBottom: 10,
      textAlign: 'center',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 10,
      color: '#64748b',
      marginBottom: 5,
    },
    section: {
      marginBottom: 6,
      fontSize: 8,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      marginBottom: 3,
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: 2,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
      fontSize: 10,
    },
    col: {
      flex: 1,
    },
    colRight: {
      textAlign: 'right',
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 0.5,
      fontSize: 7,
      lineHeight: 1.1,
    },
    itemName: {
      flex: 3,
    },
    itemQty: {
      flex: 1,
      textAlign: 'center',
    },
    itemPrice: {
      flex: 2,
      textAlign: 'right',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 4,
      borderTop: '1px dashed #cbd5e1',
      fontWeight: 'bold',
      fontSize: 10,
    },
    footer: {
      marginTop: 4,
      fontSize: 6,
      textAlign: 'center',
      color: '#64748b',
      paddingTop: 4,
      borderTop: '1px solid #e2e8f0',
    },
    divider: {
      borderTop: '1px dashed #cbd5e1',
      margin: '10px 0',
    },
  });

  // Definir el tipo BusinessInfo
  interface BusinessInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    ruc: string;
    cuit: string;
    footerText: string;
    logo: string;
  }

  const businessInfo: BusinessInfo = {
    name: orderResponse?.businessName || "TECNICENTRO JR",
    address: orderResponse?.address || "Jr Chanchamayo 650, puesto 1 y 2",
    phone: orderResponse?.phone || "+51 993 485 170",
    email: "tecnicentrojrcajamarca@gmail.com",
    ruc: "20123456789",
    cuit: "",
    footerText: "Gracias por su compra. Vuelva pronto.",
    logo: ""
  };

  // Función para validar y normalizar el tipo de documento
  const getValidDocumentType = (docType: string | undefined): 'dni' | 'ruc' | 'ci' | 'other' => {
    if (!docType) return 'dni';
    const type = docType.toLowerCase();
    if (['dni', 'ruc', 'ci', 'other'].includes(type)) {
      return type as 'dni' | 'ruc' | 'ci' | 'other';
    }
    return 'dni'; // Valor por defecto
  };

  const printThermalLikeOrderDetailsDialog = useCallback(async (details: any, printWindow?: Window | null) => {
    if (!details) return;

    try {
      const blob = await pdf(
        <ReceiptThermalPDF
          saleData={details}
          businessInfo={businessInfo}
          isCompleted={false}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const resolvedPrintWindow = printWindow ?? window.open(url, '_blank');

      if (resolvedPrintWindow) {
        if (printWindow) {
          try {
            resolvedPrintWindow.location.href = url;
          } catch {
            // Si falla por políticas del navegador, se intentará igualmente con onload
          }
        }

        // Esperar a que cargue el PDF antes de imprimir (patrón usado en Caja)
        setTimeout(() => {
          resolvedPrintWindow.print();
          resolvedPrintWindow.onafterprint = () => {
            resolvedPrintWindow.close();
            URL.revokeObjectURL(url);
          };
        }, 1000);
      } else {

        const a = document.createElement('a');
        a.href = url;
        a.download = `${details?.orderNumber || 'comprobante-venta'}-termico.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.error("Ventana emergente bloqueada. El PDF se descargó en su lugar.");
      }
    } catch (error) {
      console.error("Error al generar PDF para impresión:", error);
      toast.error("Error al generar el PDF para impresión");
    }
  }, [businessInfo]);

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-start md:items-center justify-center z-50 p-2 md:p-4 overflow-y-auto ${(!isOpen && !showServiceSheet) ? 'hidden' : ''}`}>
      <div className="bg-background border border-muted rounded-3xl shadow-xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-3 md:p-4 border-b rounded-t-3xl sticky top-0 bg-background z-10">
          <h2 className="text-lg md:text-xl font-semibold">Nueva Venta</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
        </div>

        {/* Diálogo de hoja de servicio */}
        <Dialog open={showServiceSheet} onOpenChange={(open) => {
          if (!open) {
            console.log(" Usuario cerró hoja de servicio - reseteando formulario");
            resetSaleState(); // Reset completo cuando el usuario cierra la hoja de servicio
            setShowServiceSheet(false);
          }
        }}>
          <DialogContent className="w-[98vw] max-w-[98vw] h-[98vh] max-h-[98vh] flex flex-col p-0 overflow-hidden z-[60]">
            <DialogHeader className="px-6 pt-4 pb-2 border-b">
              <div className="flex justify-between items-center">
                <DialogTitle className="text-2xl font-bold">
                  Comprobante de Venta
                </DialogTitle>
                {canIssuePdf && (
                  <div className="flex space-x-2">
                    <PDFDownloadLink
                      document={
                        <ReceiptThermalPDF
                          saleData={orderResponse}
                          businessInfo={businessInfo}
                          isCompleted={orders.some(order => order.id === orderResponse.orderId && order.status === 'COMPLETED')}
                        />
                      }
                      fileName={`comprobante-${new Date().toISOString().split('T')[0]}.pdf`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {({ loading }: PDFDownloadLinkRenderProps) => (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          {loading ? 'Generando...' : 'Descargar PDF'}
                        </>
                      )}
                    </PDFDownloadLink>
                    <button
                      onClick={async () => {
                        const receiptData = orderResponse;
                        if (!receiptData) return;
                        
                        try {
                          const { default: ReceiptThermalPDF } = await import('./ReceiptThermalPDF');
                          const blob = await pdf(
                            <ReceiptThermalPDF 
                              saleData={receiptData} 
                              businessInfo={businessInfo}
                              isCompleted={orders.some(order => order.id === receiptData.orderId && order.status === 'COMPLETED')}
                            />
                          ).toBlob();
                          
                          const pdfUrl = URL.createObjectURL(blob);
                          const printWindow = window.open(pdfUrl, '_blank');
                          
                          if (printWindow) {
                            setTimeout(() => {
                              printWindow.print();
                            }, 500);
                          }
                        } catch (error) {
                          console.error('Error al generar el PDF:', error);
                          // Usar toast de la forma correcta
                          const { toast: showToast } = await import('@/components/ui/use-toast');
                          showToast({
                            title: "Error",
                            description: "No se pudo generar el PDF para imprimir",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-0">
              {showServiceSheet && orderResponse ? (
                <PDFViewer
                  width="100%"
                  height="100%"
                  style={{
                    border: "none",
                    minHeight: "calc(98vh - 120px)",
                    backgroundColor: "white",
                  }}
                >
                  <ReceiptThermalPDF
                    saleData={orderResponse}
                    businessInfo={businessInfo}
                    isCompleted={orders.some(order => order.id === orderResponse.orderId && order.status === 'COMPLETED')}
                  />
                </PDFViewer>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  backgroundColor: "white",
                  color: "#666"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 10 }}>
                      Hoja de Servicio
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Complete una venta para ver la hoja de servicio
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex-1 overflow-y-auto">
          <div className="h-full flex flex-col md:flex-row">
            {/* Panel izquierdo - Productos */}
            <div className="w-full md:w-1/2 p-4 border-r overflow-auto">
              <form onSubmit={handleAddCustomItem} className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de ítem</label>
                  <select
                    name="type"
                    value={newItem.type}
                    onChange={handleNewItemChange}
                    className={`w-full p-2 bg-muted border rounded ${isTypeLocked ? 'text-gray-500' : ''}`}
                    disabled={!(canSellProducts && canSellServices) || isTypeLocked}
                    required
                  >
                    {canSellProducts && <option value="product">Producto</option>}
                    {canSellServices && <option value="service">Servicio</option>}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {(() => {
                      switch (newItem.type) {
                        case "product":
                          return "Buscar producto";
                        case "service":
                          return newItem.serviceType === "MISELANEOUS" ? "Nombre" : "Nombre del servicio";
                        default:
                          return "Nombre del ítem";
                      }
                    })()}
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      name="name"
                      value={newItem.name}
                      onChange={handleNewItemChange}
                      onFocus={handleFocus}
                      className="w-full p-2 border rounded"
                      placeholder={
                        (() => {
                          switch (newItem.type) {
                            case "product":
                              return "Buscar producto...";
                            case "service":
                              return newItem.serviceType === "MISELANEOUS" ? "Nombre" : "Nombre del servicio";
                            default:
                              return "Nombre del ítem";
                          }
                        })()
                      }
                    />
                    {isDropdownOpen && newItem.type === "product" && (
                      <div className="absolute z-10 w-full mt-1 bg-card text-card-foreground border rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-700">
                        {filteredItems().map((item) => {
                          const isProduct = "stock" in item;
                          const stock = isProduct ? (item as any).stock : 0;
                          const hasStock = isProduct && stock > 0;
                          
                          return (
                            <div
                              key={item.id}
                              className={`px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200 dark:hover:bg-gray-700 ${
                                isProduct && !hasStock ? 'border-l-4 border-red-500 bg-red-50' : ''
                              }`}
                              onClick={() => handleItemSelect(item)}
                            >
                              <div className="font-medium flex items-center justify-between">
                                <span>{item.name}</span>
                                {isProduct && !hasStock && (
                                  <span className="text-xs text-red-600 font-semibold">SIN STOCK</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>{formatCurrency(item.price)}</span>
                                {isProduct && (
                                  <span className={`text-xs ${hasStock ? 'text-green-600' : 'text-red-600'}`}>
                                    Stock: {stock}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {filteredItems().length === 0 && (
                          <div className="p-2 text-gray-500">
                            No se encontraron productos
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Campos de precio y cantidad con métodos de pago */}
                <div className="space-y-4">
                  {(() => {
                    const showPrice = newItem.type === "service";
                    const showQuantity = newItem.type !== "service";
                    const isProduct = newItem.type === "product";
                    const selectedProduct = isProduct && products.find(p => p.id === newItem.id);
                    const basePrice = selectedProduct ? selectedProduct.price : 0;

                    // Calcular siempre el total esperado de la compra según cantidad y precio
                    const quantityNumber = (() => {
                      const q = parseInt(newItem.quantity as string, 10);
                      return isNaN(q) || q < 1 ? 1 : q;
                    })();

                    let expectedTotal = 0;

                    if (isProduct) {
                      // Para productos: usar precio personalizado si se ingresó, sino el precio base
                      let unitPrice = 0;

                      if (newItem.price) {
                        const customPrice = Number(parseFloat(newItem.price as string));
                        if (!isNaN(customPrice) && customPrice >= 0) {
                          unitPrice = customPrice;
                        }
                      }

                      if (unitPrice === 0) {
                        unitPrice = basePrice;
                      }

                      expectedTotal = unitPrice * quantityNumber;
                    } else {
                      // Para servicios: usar el precio ingresado y la cantidad (1 para servicio)
                      const unitPrice = Number(parseFloat(newItem.price as string)) || 0;
                      const qty = showQuantity ? quantityNumber : 1;
                      expectedTotal = unitPrice * qty;
                    }

                    return (
                      <>
                        {/* Campos de precio y cantidad en una fila */}
                        <div className="grid grid-cols-2 gap-4">
                          {showPrice && (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">
                                  {isProduct ? "Precio unitario" : "Precio"}
                                </label>
                                {isProduct && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(basePrice)}
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                name="price"
                                value={newItem.price}
                                onChange={handleNewItemChange}
                                className="w-full p-2 border rounded"
                                placeholder={isProduct ? `Dejar vacío para usar precio base (${formatCurrency(basePrice)})` : "0.00"}
                                min="0"
                                step="0.01"
                                required={!isProduct}
                              />
                            </div>
                          )}

                          {showQuantity && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Cantidad</label>
                              <input
                                type="number"
                                name="quantity"
                                value={newItem.quantity}
                                onChange={handleNewItemChange}
                                className="w-full p-2 border rounded"
                                min="1"
                                required
                              />
                            </div>
                          )}
                        </div>

                        {/* Total esperado de la compra según cantidad y precio */}
                        <div className="text-xs text-muted-foreground text-right">
                          Total a pagar: {formatCurrency(expectedTotal)}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {newItem.type === "service" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de servicio</label>
                      <select
                        name="serviceType"
                        value={newItem.serviceType || (tenantDefaultServiceLoaded ? tenantDefaultService : "REPAIR")}
                        onChange={handleNewItemChange}
                        className="w-full p-2 bg-muted border rounded"
                        required
                      >
                        <option value="REPAIR">Reparación</option>
                        <option value="WARRANTY">Garantía</option>
                        <option value="MISELANEOUS">Misceláneo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notas/Detalles del servicio</label>
                      <textarea
                        name="notes"
                        value={newItem.notes}
                        onChange={handleNewItemChange}
                        className="w-full p-2 border rounded resize-none"
                        placeholder="Describe el problema, detalles del servicio, observaciones..."
                        rows={3}
                      />
                    </div>

                    {hasImageUpload && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Imágenes del servicio
                        </label>

                        {/* Área de dropzone - solo visible si no hay imágenes */}
                        {(!newItem.images || newItem.images.length === 0) && (
                          <div
                            {...getRootProps()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                          >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Plus className="h-8 w-8 text-gray-400" />
                              {isDragActive ? (
                                <p className="text-sm text-gray-600">
                                  Suelta las imágenes aquí...
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    Arrastra y suelta imágenes aquí, o haz clic
                                    para seleccionar
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Formatos soportados: .jpeg, .jpg, .png, .webp
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Muestra las miniaturas de las imágenes */}
                        {newItem.images && newItem.images.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium">
                                Imágenes seleccionadas ({newItem.images.length})
                              </h4>
                              {/* Botón para agregar más imágenes */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.multiple = true;
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement)
                                      .files;
                                    if (files) {
                                      onDrop(Array.from(files));
                                    }
                                  };
                                  input.click();
                                }}
                                className="text-sm text-primary hover:underline flex items-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                Agregar más
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {newItem.images.map((file, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="relative group w-16 h-16 rounded-md overflow-hidden border"
                                >
                                  <Image
                                    src={URL.createObjectURL(file)}
                                    alt={`Vista previa ${index + 1}`}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(index);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar al carrito
                </Button>
              </form>

              {/* Formulario de cliente - se muestra cuando hay items en el carrito */}
              {!hasGenericClient && selectedItems.length > 0 && renderCustomerForm()}
            </div>

            {/* Panel derecho - Carrito */}
            <div className="w-full md:w-1/2 p-4 flex flex-col">
              <h3 className="text-lg font-medium mb-4">Detalle de la Venta</h3>

              {selectedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p>El carrito está vacío</p>
                  <p className="text-sm">Agrega productos o servicios</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto mb-4">
                    <div className="space-y-2">
                      {selectedItems.map((item) => {
                        // Para servicios, siempre usar el precio total del servicio
                        // Para productos y personalizados, usar el precio personalizado si existe
                        const itemKey = `${item.type}-${item.id}`;
                        const baseUnitPrice = item.price;
                        const currentUnitPrice = item.customPrice ?? item.price;

                        const editedUnitPriceStr = item.type === "product"
                          ? (editedProductPrices[itemKey] ?? currentUnitPrice.toString())
                          : currentUnitPrice.toString();

                        const parsedEditedUnitPrice = item.type === "product" && editedUnitPriceStr !== ""
                          ? Number(editedUnitPriceStr)
                          : undefined;

                        const finalUnitPrice = item.type === "service"
                          ? item.price
                          : item.type === "product"
                            ? (parsedEditedUnitPrice ?? 0)
                            : currentUnitPrice;

                        const isUnitPriceModified = item.type === "product" && (
                          editedUnitPriceStr === "" ||
                          (parsedEditedUnitPrice !== undefined && parsedEditedUnitPrice !== baseUnitPrice)
                        );
                        
                        const originalTotal = baseUnitPrice * item.quantity;
                        const finalTotal = finalUnitPrice * item.quantity;
                        
                        return (
                          <div
                            key={`${item.id}-${item.type}`}
                            className="p-3 border rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">
                                {item.type === "product" ? (
                                  <>
                                    <input
                                      type="number"
                                      value={editedUnitPriceStr}
                                      onChange={(e) => {
                                        const value = e.target.value;

                                        setEditedProductPrices((prev) => ({
                                          ...prev,
                                          [itemKey]: value,
                                        }));

                                        setSelectedItems((prev) =>
                                          prev.map((i) => {
                                            if (i.type !== "product" || i.id !== item.id) return i;

                                            if (value === "") {
                                              return { ...i, customPrice: undefined };
                                            }

                                            const parsed = Number(value);
                                            if (!Number.isFinite(parsed)) {
                                              return i;
                                            }

                                            if (parsed === i.price) {
                                              return { ...i, customPrice: undefined };
                                            }

                                            return { ...i, customPrice: parsed };
                                          })
                                        );
                                      }}
                                      onWheel={(e: React.WheelEvent<HTMLInputElement>) =>
                                        (e.target as HTMLInputElement).blur()
                                      }
                                      className="w-20 px-1 border rounded text-sm text-right"
                                      min="0"
                                      step="0.1"
                                    />
                                  </>
                                ) : (
                                  <>{formatCurrency(finalUnitPrice)}</>
                                )}
                                {" "}x {item.quantity} = {formatCurrency(finalTotal)}
                                {isUnitPriceModified && (
                                  <span className="text-xs text-muted-foreground ml-2 line-through">
                                    {formatCurrency(originalTotal)}
                                  </span>
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              {item.type !== "service" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedItems((prev) =>
                                        prev.map((i) =>
                                          i.id === item.id && i.type === item.type
                                            ? {
                                                ...i,
                                                quantity: Math.max(1, i.quantity - 1),
                                              }
                                            : i
                                        )
                                      )
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedItems((prev) =>
                                        prev.map((i) =>
                                          i.id === item.id && i.type === item.type
                                            ? { ...i, quantity: i.quantity + 1 }
                                            : i
                                        )
                                      )
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </>
                              )}

                              {item.type === "service" && (
                                <span className="w-8 text-center text-muted-foreground">
                                  {item.quantity}
                                </span>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>
                        {formatCurrency(
                          selectedItems.reduce((sum, item) => {
                            // Para servicios, siempre usar el precio total del servicio
                            // Para productos y personalizados, usar el precio personalizado si existe
                            const itemPrice = item.type === "service"
                              ? item.price
                              : item.customPrice !== undefined
                                ? item.customPrice
                                : item.price;
                            return sum + (itemPrice * item.quantity);
                          }, 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <div className="flex justify-between w-full gap-4">
                        <span>Total:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedItems.reduce((sum, item) => {
                              // Para servicios, siempre usar el precio total del servicio
                              // Para productos y personalizados, usar el precio personalizado si existe
                              const itemPrice = item.type === "service"
                                ? item.price
                                : item.customPrice !== undefined
                                  ? item.customPrice
                                  : item.price;
                              return sum + (itemPrice * item.quantity);
                            }, 0)
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 items-center justify-between space-y-2">
                      <div className="w-full space-y-4">
                        {uploadStatus.inProgress && (
                          <div className="w-full bg-background/50 p-3 rounded-lg border">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="font-medium">Subiendo imágenes...</span>
                              <span className="font-semibold">{uploadStatus.progress}%</span>
                            </div>
                            <Progress
                              value={uploadStatus.progress}
                              className="h-2 w-full"
                            />
                          </div>
                        )}
                        
                        {showUploadError && uploadStatus.error && (
                          <div className="w-full p-4 bg-error-light/10 border-l-4 border-error rounded-r">
                            <div className="flex items-start">
                              <XCircle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
                              <div className="ml-3 flex-1">
                                <div className="text-sm text-foreground font-medium">
                                  {uploadStatus.error}
                                </div>
                                
                                {uploadStatus.failedFiles.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">
                                      Archivos con errores:
                                    </p>
                                    <ul className="mt-1 space-y-1.5 max-h-32 overflow-y-auto pr-2">
                                      {uploadStatus.failedFiles.map((file, index) => (
                                        <li key={index} className="flex items-start text-sm">
                                          <X className="h-4 w-4 text-error/80 mt-0.5 mr-1.5 flex-shrink-0" />
                                          <div className="break-words max-w-full">
                                            <span className="text-foreground">{file.file.name}</span>
                                            <span className="text-xs text-muted-foreground block">
                                              {file.error}
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="mt-4 space-y-2">
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForceSubmit(true);
                                      setShowUploadError(false);
                                      setIsOrderPaymentsModalOpen(true);
                                    }}
                                  >
                                    Continuar sin imágenes
                                  </Button>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowUploadError(false);
                                        setUploadStatus(prev => ({
                                          ...prev,
                                          error: null,
                                          failedFiles: []
                                        }));
                                      }}
                                    >
                                      Reintentar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-destructive border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("🚫 Cancelando subida de imágenes - limpiando componente");
                                        setShowUploadError(false);
                                        setUploadStatus(prev => ({
                                          ...prev,
                                          inProgress: false,
                                          progress: 0,
                                          error: null,
                                          failedFiles: []
                                        }));
                                        // Limpiar las imágenes seleccionadas
                                        setNewItem(prev => ({
                                          ...prev,
                                          images: []
                                        }));
                                        // Limpiar todo el estado si no hay venta en progreso
                                        if (!selectedItems.length) {
                                          resetSaleState();
                                          onClose();
                                        }
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mostrar error de creación de orden */}
                        {orderError && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error al crear la orden</AlertTitle>
                            <AlertDescription>
                              {orderError.message}
                              {orderError.code && (
                                <span className="block mt-1 text-xs opacity-75">
                                  Código: {orderError.code}
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {/* Indicador de sesión de caja */}
                        <div className="mb-4">
                          {isLoadingCashSession ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              Verificando sesión de caja abierta...
                            </div>
                          ) : currentCashSession ? (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Sesión de caja abierta
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              No hay sesión de caja abierta
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            const orderTotal = selectedItems.reduce((sum, item) => {
                              const itemPrice = item.type === "service"
                                ? item.price
                                : item.customPrice !== undefined
                                  ? item.customPrice
                                  : item.price;
                              return sum + (itemPrice * item.quantity);
                            }, 0);

                            const baseMethods = orderPaymentMethods.length > 0
                              ? orderPaymentMethods
                              : [{ id: "1", type: PaymentType.EFECTIVO, amount: 0 }];

                            const hasProducts = selectedItems.some((item) => item.type === "product");
                            const initialAmount = hasProducts ? orderTotal : 0;

                            setOrderPaymentMethodsDraft(
                              baseMethods.map((m, idx) => ({
                                ...m,
                                amount: idx === 0 ? initialAmount : 0,
                              }))
                            );

                            setIsOrderPaymentsModalOpen(true);
                          }}
                          disabled={selectedItems.length === 0 || uploadStatus.inProgress || !currentCashSession}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {uploadStatus.inProgress ? "Procesando..." : "Finalizar Venta"}
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          console.log("🚫 Cancelando venta - limpiando componente");
                          resetSaleState();
                          onClose();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de pago */}
      <PaymentConfirmationDialog
        isOpen={paymentConfirmation.isOpen}
        onClose={handlePaymentCancel}
        onConfirm={handlePaymentConfirmation}
        itemName={paymentConfirmation.itemName}
        expectedTotal={paymentConfirmation.expectedTotal}
        paymentTotal={paymentConfirmation.paymentTotal}
      />

      {/* Modal de métodos de pago (a nivel orden) */}
      <Dialog
        open={isOrderPaymentsModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsOrderPaymentsModalOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Métodos de pago</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Agregar métodos</label>
              <button
                type="button"
                onClick={addOrderPaymentMethod}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Agregar método
              </button>
            </div>

            <div className="space-y-2">
              {orderPaymentMethodsDraft.map((paymentMethod) => (
                <div key={paymentMethod.id} className="flex gap-2">
                  <select
                    value={paymentMethod.type}
                    onChange={(e) =>
                      updateOrderPaymentMethod(
                        paymentMethod.id,
                        "type",
                        e.target.value as PaymentTypeValue
                      )
                    }
                    className="flex-1 p-2 border rounded text-sm text-[#a3a3a3]"
                  >
                    <option value={PaymentType.EFECTIVO}>Efectivo</option>
                    <option value={PaymentType.TARJETA}>Tarjeta</option>
                    <option value={PaymentType.TRANSFERENCIA}>Transferencia</option>
                    <option value={PaymentType.YAPE}>Yape</option>
                    <option value={PaymentType.PLIN}>Plin</option>
                    <option value={PaymentType.DATAPHONE}>Datáfono</option>
                    <option value={PaymentType.BIZUM}>Bizum</option>
                    <option value={PaymentType.OTRO}>Otro</option>
                  </select>

                  <input
                    type="number"
                    value={paymentMethod.amount}
                    onChange={(e) =>
                      updateOrderPaymentMethod(
                        paymentMethod.id,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="w-28 p-2 border rounded text-sm"
                    placeholder="Monto"
                    min="0"
                    step="0.01"
                  />

                  {orderPaymentMethodsDraft.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOrderPaymentMethod(paymentMethod.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOrderPaymentsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setOrderPaymentMethods(orderPaymentMethodsDraft);
                setIsOrderPaymentsModalOpen(false);
                handleSubmit(orderPaymentMethodsDraft);
              }}
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}