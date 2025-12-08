import { api } from "./api";

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
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
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
  type: 'REPAIR' | 'WARRANTY';
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

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  userId: string;
  totalAmount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
  client?: Client;
  services?: Service[];
  orderProducts?: OrderProduct[];
  user?: UserInfo;
  cashSessionId?: string;
  cashSession?: {
    id: string;
    status: "OPEN" | "CLOSED";
    openingAmount?: number;
    closingAmount?: number | null;
    openedAt?: string;
    closedAt?: string | null;
  };
}

export const orderService = {
  // ✅ ACTUALIZADO: Completar orden (ahora soporta abonos parciales)
  async completeOrder(orderData: {
    orderId: string;
    services: Array<{
      serviceId: string;
      payments: Array<{
        type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
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
    products?: Array<{
      productId: string;
      quantity: number;
      price?: number; // Ahora se usa como customPrice
      payments?: Array<{
        type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
        amount: number;
      }>;
    }>;
    services?: Array<{
      name: string;
      description?: string;
      price: number;
      type: 'REPAIR' | 'WARRANTY';
      photoUrls?: string[];
      payments?: Array<{
        type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
        amount: number;
      }>; // Ahora permite adelantos
    }>;
    cashSessionId: string; // ✅ OBLIGATORIO
  }): Promise<Order> {
    console.log('=== INICIO: Datos recibidos en orderService.createOrder ===');
    console.log('Datos completos recibidos:', JSON.stringify(orderData, null, 2));
    
    // ✅ Validación obligatoria de cashSessionId
    if (!orderData.cashSessionId) {
      throw new Error('El ID de la sesión de caja es obligatorio');
    }

    // Validar que al menos se proporcione clientId o clientInfo con DNI
    if (!orderData.clientId && !orderData.clientInfo?.dni) {
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
        ...(orderData.clientInfo && { clientInfo: orderData.clientInfo }),
        ...(orderData.products && { 
          products: orderData.products.map(p => {
            const productData: {
              productId: string;
              quantity: number;
              price?: number; // ✅ Ahora se usa como customPrice
              payments?: Array<{
                type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
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
              // Validar montos positivos
              for (const payment of p.payments) {
                if (payment.amount <= 0) {
                  throw new Error('El monto de pago debe ser mayor a cero');
                }
              }
              productData.payments = p.payments;
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
              type: 'REPAIR' | 'WARRANTY';
              photoUrls?: string[];
              payments?: Array<{
                type: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'OTRO';
                amount: number;
              }>;
            } = {
              name: s.name,
              price: s.price,
              type: s.type
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
              // Validar montos positivos
              for (const payment of s.payments) {
                if (payment.amount <= 0) {
                  throw new Error('El monto de pago debe ser mayor a cero');
                }
              }
              serviceData.payments = s.payments;
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
      console.error("Error Creating Order");

      if (error instanceof Error) {
        console.error("Error Details:", error.message);

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

          console.error("Response Status:", response.status);
          console.error("Response Data:", response.data);

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
      } else {
        console.error("Unknown error occurred:", error);
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

  // ✅ ACTUALIZADO: Cancelar orden (ya no necesita credenciales)
  async cancelOrder(id: string): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<Order>(`orders/${id}/cancel`, {}, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        }
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
};