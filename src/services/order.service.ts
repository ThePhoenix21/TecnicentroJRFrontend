import { api } from "./api";

type CanonicalServiceType = 'REPAIR' | 'WARRANTY' | 'MISELANEOUS';
type ServiceTypeInput = CanonicalServiceType | 'OTHER';

type CanonicalPaymentType = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
export type PaymentTypeInput = CanonicalPaymentType | 'DATAPHONE' | 'BIZUM';

const normalizeServiceType = (type: ServiceTypeInput): CanonicalServiceType => {
  return type === 'OTHER' ? 'MISELANEOUS' : type;
};

export interface OrderItemDto {
  product: {
    id: string;
  };
  quantity: number;
  unitPrice?: number;
  name?: string;
}

export interface CreateOrderDto {
  items: OrderItemDto[];
  paymentMethod?: string;
  clientId?: string | null;
  total: number;
  status?: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
}

export interface OrderItem extends OrderItemDto {
  id: string;
  subtotal: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  dni?: string;
  ruc?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

interface Service {
  id: string;
  type: CanonicalServiceType;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'PAID' | 'ANNULLATED';
  name: string;
  description?: string;
  photoUrls?: string[];
  price: number;
  createdAt: string;
  updatedAt: string;
  orderId: string;
}

export interface OrderProduct {
  id: string;
  productId: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  product?: {
    id: string;
    name: string;
    price: number;
    description?: string;
  };
}

export interface UserInfo {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface PaymentMethod {
  id: string;
  type: PaymentTypeInput;
  amount: number;
  createdAt?: string;
}

export interface OrderLookupItem {
  value: string;
  label: string;
}

export interface OrderListProductItem {
  name: string;
  quantity: number;
}

export interface OrderListServiceItem {
  name: string;
  price: number;
}

export interface OrderListPaymentMethodItem {
  type: PaymentTypeInput;
  amount: number;
}

export interface OrderListItem {
  id: string;
  createdAt: string;
  clientName: string;
  sellerName: string;
  products: OrderListProductItem[];
  services: OrderListServiceItem[];
  status: string;
  paymentMethods: OrderListPaymentMethodItem[];
  refundPaymentMethods?: OrderListPaymentMethodItem[];
  totalAmount?: number;
  total?: number;
}

export interface OrdersListResponse {
  data: OrderListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CompleteOrderResponse {
  success: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  items?: OrderItem[];
  userId: string;
  totalAmount: number;
  status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED";
  paymentMethod?: string;
  paymentMethods?: PaymentMethod[];
  isPriceModified?: boolean;
  canceledAt?: string | null;
  canceledById?: string | null;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
  client?: Client;
  services?: Service[];
  orderProducts?: OrderProduct[];
  user?: UserInfo;
  cashSessionId?: string;
  cashSessionsId?: string;
  cashSession?: {
    id: string;
    status: "OPEN" | "CLOSED";
    openingAmount?: number;
    closingAmount?: number | null;
    openedAt?: string;
    closedAt?: string | null;
  };
}

export interface OrderPaymentMethodsResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  totalPaid: number;
  pendingAmount: number;
  payments: PaymentMethod[];
}

export const orderService = {
  async listOrders(params: {
    page?: number;
    pageSize?: number;
    clientName?: string;
    sellerName?: string;
    orderNumber?: string;
    status?: string;
    storeId: string;
    currentCash?: boolean;
  }): Promise<OrdersListResponse> {
    const token = localStorage.getItem("auth_token");
    
    try {
      // SIEMPRE usar /orders/store/{storeId} - storeId es obligatorio
      if (!params.storeId) {
        throw new Error('storeId es obligatorio para listar órdenes');
      }
      
      const { storeId, ...otherParams } = params;
      
      // Filtrar solo parámetros que el endpoint /orders/store/:storeId acepta
      const validParams: any = {};
      if (otherParams.page) validParams.page = otherParams.page;
      if (otherParams.pageSize) validParams.pageSize = otherParams.pageSize;
      if (otherParams.currentCash !== undefined) validParams.currentCash = otherParams.currentCash;
      if (otherParams.clientName) validParams.clientName = otherParams.clientName;
      if (otherParams.sellerName) validParams.sellerName = otherParams.sellerName;
      if (otherParams.orderNumber) validParams.orderNumber = otherParams.orderNumber;
      if (otherParams.status) validParams.status = otherParams.status;
      
      // El endpoint /orders/store/{storeId} ahora devuelve OrdersListResponse con paginación
      const response = await api.get<OrdersListResponse>(`/orders/store/${storeId}`, {
        params: validParams,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      // Si el backend devuelve Order[] en lugar de OrderListItem[], necesitamos convertir
      const firstOrder = response.data.data?.[0];
      
      if (firstOrder && !firstOrder.clientName && (firstOrder as any).client) {
        // El backend devuelve Order[], necesitamos convertir a OrderListItem[]
        const convertedData = response.data.data.map((order: any) => {
          return {
            id: order.id,
            createdAt: order.createdAt,
            clientName: order.client?.name || 'Cliente sin nombre',
            sellerName: order.user?.name || 'Vendedor sin nombre',
            products: order.orderProducts?.map((p: any) => ({
              name: p.product?.name || 'Producto',
              quantity: p.quantity
            })) || [],
            services: order.services?.map((s: any) => ({
              name: s.name,
              price: s.price
            })) || [],
            status: order.status,
            paymentMethods: order.paymentMethods?.map((p: any) => ({
              type: p.type,
              amount: p.amount
            })) || [],
            totalAmount: order.totalAmount,
            total: order.totalAmount
          };
        });
        
        return {
          ...response.data,
          data: convertedData
        };
      }
      
      return response.data;
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        return {
          data: [],
          total: 0,
          totalPages: 1,
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 10,
        };
      }
      throw error;
    }
  },

  async getOrderStatusLookup(): Promise<OrderLookupItem[]> {
    const token = localStorage.getItem("auth_token");
    const response = await api.get<OrderLookupItem[]>('orders/lookup-status', {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.data;
  },

  async lookupOrderNumbers(search?: string): Promise<string[]> {
    const token = localStorage.getItem("auth_token");
    const response = await api.get<string[]>('orders/lookup-order-numbers', {
      params: search?.trim() ? { search: search.trim() } : undefined,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async addOrderPayments(orderId: string, payments: Array<{ type: PaymentTypeInput; amount: number }>): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<Order>(`orders/${orderId}/payments`, { payments }, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error al registrar adelanto de pago:", error);
      throw error;
    }
  },

  async completeOrderById(orderId: string): Promise<CompleteOrderResponse> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<CompleteOrderResponse>(`orders/${orderId}/complete`, {}, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error("Error al completar la orden:", error);
      throw error;
    }
  },

  async completeOrder(orderData: {
    orderId: string;
    services: Array<{
      serviceId: string;
      payments: Array<{
        type: PaymentTypeInput;
        amount: number;
      }>;
    }>;
  }): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<Order>('orders/complete', orderData, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error al completar la orden:", error);
      throw error;
    }
  },

  // ✅ ACTUALIZADO: Crear orden (con cashSessionId obligatorio)
  async createOrder(orderData: {
    clientId?: string;
    clientInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      dni: string;
      ruc?: string;
    };
    paymentMethods?: Array<{
      type: PaymentTypeInput;
      amount: number;
    }>;
    products?: Array<{
      productId: string;
      quantity: number;
      price?: number; // Ahora se usa como customPrice
      payments?: Array<{
        type: PaymentTypeInput;
        amount: number;
      }>;
    }>;
    services?: Array<{
      name?: string;
      description?: string;
      price: number;
      type: ServiceTypeInput;
      photoUrls?: string[];
      payments?: Array<{
        type: PaymentTypeInput;
        amount: number;
      }>;
    }>;
    cashSessionId: string; // ✅ OBLIGATORIO
  }): Promise<Order> {
    console.log('=== INICIO: Datos recibidos en orderService.createOrder ===');
    console.log('Datos completos recibidos:', JSON.stringify(orderData, null, 2));

    const normalizedClientInfo = orderData.clientInfo
      ? {
        ...orderData.clientInfo,
        dni: orderData.clientInfo.dni?.trim() || '00000000',
      }
      : undefined;

    // ✅ Validación obligatoria de cashSessionId
    if (!orderData.cashSessionId) {
      throw new Error('El ID de la sesión de caja es obligatorio');
    }

    // Validar que al menos se proporcione clientId o clientInfo con DNI
    if (!orderData.clientId && !normalizedClientInfo?.dni) {
      throw new Error('Se requiere clientId o clientInfo con DNI');
    }

    // Validar que se proporcione al menos un producto o servicio
    if ((!orderData.products || orderData.products.length === 0) &&
          (!orderData.services || orderData.services.length === 0)) {
      throw new Error('Se requiere al menos un producto o servicio');
    }

    // Validar que no se especifiquen clientId y clientInfo simultáneamente
    if (orderData.clientId && orderData.clientInfo) {
      throw new Error('No se puede especificar clientId y clientInfo simultáneamente');
    }

    try {
      const token = localStorage.getItem("auth_token");

      // ✅ Preparar los datos para la solicitud (sin status, lo maneja el backend)
      const requestData = {
        ...(orderData.clientId && { clientId: orderData.clientId }),
        ...(normalizedClientInfo && { clientInfo: normalizedClientInfo }),
        ...(orderData.paymentMethods && { paymentMethods: orderData.paymentMethods }),
        ...(orderData.products && { 
          products: orderData.products.map(p => {
            const productData: {
              productId: string;
              quantity: number;
              price?: number; // ✅ Ahora se usa como customPrice
              payments?: Array<{
                type: PaymentTypeInput;
                amount: number;
              }>;
            } = {
              productId: p.productId,
              quantity: p.quantity
            };
            
            // ✅ Incluir price si existe (el backend lo convertirá a customPrice)
            if (p.price !== undefined) {
              productData.price = p.price;
            }
            
            // Incluir payments si existen
            if (p.payments && p.payments.length > 0) {
              const validPayments = p.payments.filter((payment) => payment.amount > 0);
              if (validPayments.length > 0) {
                productData.payments = validPayments;
              }
            }
            
            return productData;
          }) 
        }),
        ...(orderData.services && { 
          services: orderData.services.map(s => {
            const serviceData: {
              name: string;
              description?: string;
              price: number;
              type: CanonicalServiceType;
              photoUrls?: string[];
              payments?: Array<{
                type: PaymentTypeInput;
                amount: number;
              }>;
            } = {
              name: s.name?.trim() || 'Defauld_Service',
              price: s.price,
              type: normalizeServiceType(s.type)
            };
            
            // Incluir description si existe
            if (s.description) {
              serviceData.description = s.description;
            }
            
            // Incluir photoUrls si existen
            if (s.photoUrls && s.photoUrls.length > 0) {
              serviceData.photoUrls = s.photoUrls;
            }
            
            // ✅ Incluir payments si existen (adelantos)
            if (s.payments && s.payments.length > 0) {
              const validPayments = s.payments.filter((payment) => payment.amount > 0);
              if (validPayments.length > 0) {
                serviceData.payments = validPayments;
              }
            }
            
            return serviceData;
          })
        }),
        cashSessionId: orderData.cashSessionId // ✅ OBLIGATORIO
      };

      console.group('Sending Order Data to Backend');
      console.log('Endpoint:', 'orders/create');
      console.log('Method:', 'POST');
      console.log('Request Data:', JSON.stringify(requestData, null, 2));
      console.groupEnd();

      const response = await api.post<Order>('orders/create', requestData, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      console.group("Order Created Successfully");
      console.log("Response Status:", response.status);
      console.log("Response Data:", response.data);
      console.groupEnd();

      return response.data;
    } catch (error) {
      // Manejo silencioso de errores para evitar mostrar en consola

      if (error instanceof Error) {
        if ('response' in error && error.response) {
          const response = error.response as {
            status?: number;
            data?: {
              message?: string;
              error?: string;
              code?: string;
              statusCode?: number;
            };
          };

          // Extraer el mensaje de error del backend
          if (response.data?.message) {
            const errorMessage = response.data.message;
            const errorCode = response.data.code;
            
            // Crear un error personalizado con el mensaje del backend
            interface CustomError extends Error {
              code?: string;
              statusCode?: number;
            }
            
            const customError: CustomError = new Error(errorMessage);
            customError.code = errorCode;
            customError.statusCode = response.data.statusCode || response.status;
            
            throw customError;
          }
        }
      }

      throw error;
    }
  },

  // ✅ ACTUALIZADO: Obtener todas las órdenes (solo ADMIN)
  async getOrders(): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>("orders", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener las órdenes:", error);
      throw error;
    }
  },

  // ✅ ACTUALIZADO: Obtener orden por ID
  async getOrderById(id: string): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order>(`orders/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener la orden ${id}:`, error);
      throw error;
    }
  },

  // ✅ ACTUALIZADO: Obtener órdenes de usuario (solo ADMIN)
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>(`orders/user/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener las órdenes del usuario ${userId}:`, error);
      throw error;
    }
  },

  // ✅ ACTUALIZADO: Cancelar orden (acepta métodos de reembolso opcionales)
  async cancelOrder(id: string, paymentMethods?: Array<{ type: PaymentTypeInput; amount: number }>): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const payload = paymentMethods && paymentMethods.length > 0 ? { paymentMethods } : {};
      const response = await api.patch<Order>(`orders/${id}/cancel`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error al cancelar la orden ${id}:`, error);
      throw error;
    }
  },

  // ✅ NUEVO: Obtener órdenes del usuario autenticado
  async getMyOrders(): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>("orders/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener mis órdenes:", error);
      throw error;
    }
  },

  // ✅ NUEVO: Obtener órdenes por tienda
  async getOrdersByStore(storeId: string): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>(`/orders/store/${storeId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener las órdenes de la tienda ${storeId}:`, error);
      throw error;
    }
  },

  // ✅ NUEVO: Obtener detalles completos de una orden para PDF y visualización
  async getOrderDetails(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<any>(`orders/details/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener detalles de la orden ${id}:`, error);
      throw error;
    }
  },

  async getOrderPaymentMethods(orderId: string): Promise<OrderPaymentMethodsResponse> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<OrderPaymentMethodsResponse>(`orders/${orderId}/payment-methods`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener los métodos de pago de la orden ${orderId}:`, error);
      throw error;
    }
  },

  async hardDeleteOrdersByDateRange(payload: {
    fromDate: string;
    toDate: string;
    email: string;
    password: string;
    reason: string;
  }): Promise<any> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.post<any>(
        'orders/hard-delete/by-date-range',
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error al borrar ventas por rango de fechas:', error);
      throw error;
    }
  },
};