// src/services/dashboard.service.ts
import { api } from '@/services/api';
import { storeProductService } from '@/services/store-product.service';
import { serviceService } from '@/services/service.service';
import { StoreProduct } from '@/types/store-product.types';

// Definir tipos para respuestas de API
interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  clientId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  orderProducts?: Array<{
    id: string;
    quantity: number;
    price: number;
    productId: string;
    product?: {
      id: string;
      name: string;
      description?: string;
      price: number;
      stock: number;
    };
  }>;
  services?: Array<{
    id: string;
    type: string;
    status: string;
    name: string;
    description?: string;
    price: number;
    photoUrls?: string[];
  }>;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface SalesSummary {
  total: number;
  count: number;
  average: number;
}

interface ProductsSummary {
  total: number;
  lowStock: number;
}

interface ServicesSummary {
  total: number;
  mostPopular: string;
}

interface ClientsSummary {
  total: number;
  newThisMonth: number;
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'service';
  amount: number;
  status: string;
  description: string;
  customerName: string;
  userName?: string;
  itemsCount: number;
  createdAt: string;
}

interface TopProduct {
  id: string;
  name: string;
  value: number;
  price?: number;
  description?: string;
}

// Para el dashboard solo necesitamos el nombre y la longitud del arreglo de servicios
interface DashboardServiceInfo {
  name: string;
}

export interface DashboardStats {
  salesSummary: SalesSummary;
  productsSummary: ProductsSummary;
  servicesSummary: ServicesSummary;
  clientsSummary: ClientsSummary;
  recentSales: RecentActivity[];
  topProducts: TopProduct[];
}

export const dashboardService = {
  async getDashboardStats(currentStore?: { id: string }): Promise<DashboardStats> {
    try {

      // Obtener datos en paralelo usando los servicios que funcionan
      const [ordersRes, clientsRes, productsData, servicesData] = await Promise.all([
        api.get('/orders/all').catch(() => ({ data: [] })),
        api.get('/clientes').catch(() => ({ data: { data: [] } })),
        // Usar el nuevo storeProductService si hay tienda actual, sino array vacío
        currentStore ? storeProductService.getStoreProducts(currentStore.id, 1, 100).catch(() => []) : Promise.resolve([]),
        serviceService.getServicesWithClients().catch(() => [])
      ]);

      console.log('📊 Dashboard data responses:', {
        orders: ordersRes.data,
        clients: clientsRes.data,
        products: productsData,
        services: servicesData
      });

      // Extraer datos correctamente basado en la estructura de respuesta
      const orders: Order[] = ordersRes.data || [];

      // productsData puede ser [] (en caso de error/catch) o un objeto paginado con { data: StoreProduct[], ... }
      let products: StoreProduct[] = [];
      if (Array.isArray(productsData)) {
        products = productsData;
      } else if (productsData && Array.isArray((productsData as any).data)) {
        products = (productsData as any).data;
      }

      // servicesData puede ser [] o un arreglo de objetos con al menos `name`
      let services: DashboardServiceInfo[] = [];
      if (Array.isArray(servicesData)) {
        services = servicesData as DashboardServiceInfo[];
      }

      // Manejar datos de clientes con más cuidado
      let clients: Client[] = [];
      if (clientsRes.data) {
        if (Array.isArray(clientsRes.data.data)) {
          clients = clientsRes.data.data;
        } else if (Array.isArray(clientsRes.data)) {
          clients = clientsRes.data;
        } else if (clientsRes.data && typeof clientsRes.data === 'object') {
          // Si es un objeto, intentar encontrar el array en propiedades comunes
          if (Array.isArray(clientsRes.data.items)) {
            clients = clientsRes.data.items;
          } else if (Array.isArray(clientsRes.data.data)) {
            clients = clientsRes.data.data;
          }
        }
      }

      // Calcular resumen de ventas (solo para órdenes completadas)
      const completedOrders = orders.filter((order: Order) => order.status === 'COMPLETED');

      const salesTotal = completedOrders.reduce((sum: number, order: Order) => {
        // Sumar el monto total de cada orden
        return sum + (order.totalAmount || 0);
      }, 0);

      const salesCount = completedOrders.length;
      const salesAverage = salesCount > 0 ? salesTotal / salesCount : 0;

      // Calcular resumen de productos (usando StoreProduct)
      const lowStockThreshold = 10;
      const lowStockCount = products.filter((p: StoreProduct) => p.stock <= lowStockThreshold).length;

      // Calcular resumen de clientes
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newClientsThisMonth = clients.filter((client: Client) => {
        const clientDate = new Date(client.createdAt);
        return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
      }).length;

      // Obtener ventas recientes (últimas 5)
      const recentSales = orders
        .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Obtener productos principales (por stock) - usando StoreProduct
      const topProducts = products
        .sort((a: StoreProduct, b: StoreProduct) => b.stock - a.stock)
        .slice(0, 5);

      // Obtener servicio más popular
      const mostPopularService = services[0]?.name || 'Ninguno';

      return {
        salesSummary: {
          total: salesTotal,
          count: salesCount,
          average: parseFloat(salesAverage.toFixed(2)),
        },
        productsSummary: {
          total: products.length,
          lowStock: lowStockCount,
        },
        servicesSummary: {
          total: services.length,
          mostPopular: mostPopularService,
        },
        clientsSummary: {
          total: clients.length,
          newThisMonth: newClientsThisMonth,
        },
        recentSales: recentSales.map((sale: Order) => {
          // Calcular cantidad total de productos y servicios
          const orderProductsCount = sale.orderProducts?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          const servicesCount = sale.services?.length || 0;
          const totalItemsCount = orderProductsCount + servicesCount;

          return {
            id: sale.id,
            type: 'sale',
            amount: sale.totalAmount,
            status: sale.status,
            description: `Venta #${sale.id.substring(0, 6)}`,
            customerName: sale.client?.name || `Cliente #${sale.clientId?.substring(0, 6) || 'N/A'}`,
            userName: sale.user?.name || undefined,
            itemsCount: totalItemsCount,
            createdAt: sale.createdAt,
          };
        }),
        topProducts: topProducts.map((product: StoreProduct) => ({
          id: product.id,
          name: product.product.name, // Acceder al nombre del producto anidado
          value: product.stock,
          price: product.price,
          description: product.product.description || undefined,
        })),
      };
    } catch (error) {
      // En producción, devolver datos con valores por defecto en lugar de fallar
      return {
        salesSummary: {
          total: 0,
          count: 0,
          average: 0,
        },
        productsSummary: {
          total: 0,
          lowStock: 0,
        },
        servicesSummary: {
          total: 0,
          mostPopular: 'Ninguno',
        },
        clientsSummary: {
          total: 0,
          newThisMonth: 0,
        },
        recentSales: [],
        topProducts: [],
      };
    }
  },
};