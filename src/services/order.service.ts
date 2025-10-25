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
  type: 'REPAIR' | 'WARRANTY'; // Updated to match backend specification
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAID';
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

export interface Order {
  id: string;
  orderNumber: string; // Added orderNumber field
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
}

export const orderService = {
  async updateOrderStatus(id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAID'): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  },

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
    }>;
    services?: Array<{
      name: string;
      description?: string;
      price: number;
      type: 'REPAIR' | 'WARRANTY'; // Updated to match backend specification
      photoUrls?: string[];
    }>;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAID';
  }): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");

      // Validar que al menos se proporcione clientId o clientInfo
      if (!orderData.clientId && !orderData.clientInfo) {
        throw new Error('Se requiere clientId o clientInfo');
      }

      // Validar que se proporcione al menos un producto o servicio
      if ((!orderData.products || orderData.products.length === 0) &&
          (!orderData.services || orderData.services.length === 0)) {
        throw new Error('Se requiere al menos un producto o servicio');
      }

      // Build the order data object
      const orderDataToSend = {
        ...(orderData.clientInfo && {
          clientInfo: {
            name: orderData.clientInfo.name || 'Cliente Ocasional',
            ...(orderData.clientInfo.email && { email: orderData.clientInfo.email }),
            ...(orderData.clientInfo.phone && { phone: orderData.clientInfo.phone }),
            ...(orderData.clientInfo.address && { address: orderData.clientInfo.address }),
            dni: orderData.clientInfo.dni,
            ...(orderData.clientInfo.ruc && { ruc: orderData.clientInfo.ruc })
          }
        }),
        ...(orderData.clientId && { clientId: orderData.clientId }),
        ...(orderData.products && orderData.products.length > 0 && {
          products: orderData.products.map(p => ({
            productId: p.productId,
            quantity: p.quantity
          }))
        }),
        ...(orderData.services && orderData.services.length > 0 && {
          services: orderData.services.map(s => ({
            name: s.name,
            ...(s.description && { description: s.description }),
            price: s.price,
            type: s.type,
            ...(s.photoUrls && s.photoUrls.length > 0 && { photoUrls: s.photoUrls })
          }))
        }),
        status: orderData.status || 'PENDING'
      };

      console.group('Sending Order Data to Backend');
      console.log('Endpoint:', 'orders/create');
      console.log('Method:', 'POST');
      console.log('Request Data:', JSON.stringify(orderDataToSend, null, 2));
      console.groupEnd();

      const response = await api.post<Order>(
        "orders/create",
        orderDataToSend,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

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
            data?: unknown;
          };

          console.error("Response Status:", response.status);
          console.error("Response Data:", response.data);
        }
      } else {
        console.error("Unknown error occurred:", error);
      }

      throw error;
    }
  },

  async getOrders(): Promise<Order[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order[]>("orders/all", {
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

  async getOrderById(id: string): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.get<Order>(`orders/get/${id}`, {
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

  async updateOrder(id: string, updateData: Partial<CreateOrderDto>): Promise<Order> {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await api.patch<Order>(`orders/update/${id}`, updateData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar la orden ${id}:`, error);
      throw error;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      const token = localStorage.getItem("auth_token");
      await api.delete(`orders/remove/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error(`Error al eliminar la orden ${id}:`, error);
      throw error;
    }
  },

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
  }
};