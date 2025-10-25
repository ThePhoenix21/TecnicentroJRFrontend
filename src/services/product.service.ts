// src/services/product.service.ts
import { api } from './api';
import { AxiosError } from 'axios';
import { Product, ProductsResponse } from '@/types/product.types';

export const productService = {
  async getProducts(page: number = 1, limit: number = 10, search?: string): Promise<ProductsResponse> {
  try {
    const response = await api.get<ProductsResponse>('/products/all', {
      params: { 
        page, 
        limit, 
        ...(search && { search })
      },
    });

    // If the response is an array (legacy format), transform it to the expected format
    if (Array.isArray(response.data)) {
      const items = response.data;
      return {
        data: items,
        total: items.length,
        meta: {
          totalItems: items.length,
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(items.length / limit),
          currentPage: page
        }
      };
    }

    // If the response is already in the expected format, return it directly
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching products:', {
      message: axiosError.message,
      config: axiosError.config,
      response: axiosError.response?.data,
    });
    throw new Error(axiosError.response?.data?.message || 'No se pudieron cargar los productos. Por favor, verifique su conexión e intente nuevamente.');
  }
},

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await api.get<Product>(`/products/findOne/${id}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number,
            data?: { message?: string }
          } 
        };
        
        if (axiosError.response?.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
        }
        
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      
      throw new Error('No se pudo cargar el producto. Por favor, intente nuevamente.');
    }
  },

  async createProduct(productData: Record<string, unknown> | { [key: string]: { value: unknown } } | Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy'>) {
    try {
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        throw new Error('No se encontró la información del usuario. Por favor, inicie sesión nuevamente.');
      }
      
      let userData: { id?: string; role?: string; [key: string]: unknown } = {};
      try {
        userData = JSON.parse(userJson);
        if (userData.role !== 'ADMIN') {
          throw new Error('No tienes permisos para crear productos');
        }
      } catch (e) {
        console.error('Error al verificar permisos:', e);
        throw new Error('Error al verificar los permisos. Intente nuevamente.');
      }

      if (!userData.id) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Función para extraer valores de objetos anidados
      const extractValue = (value: unknown): unknown => {
        if (value && typeof value === 'object' && 'value' in value) {
          return (value as { value: unknown }).value;
        }
        return value;
      };

      // Crear objeto con los valores extraídos
      const processedData = {
        name: extractValue((productData as { name?: unknown }).name),
        description: extractValue((productData as { description?: unknown }).description),
        price: extractValue((productData as { price?: unknown }).price),
        buycost: extractValue((productData as { buycost?: unknown }).buycost),
        stock: extractValue((productData as { stock?: unknown }).stock)
      };

      // Validar y formatear los datos
      const productToSend = {
        name: String(processedData.name || '').trim(),
        description: processedData.description ? String(processedData.description).trim() : undefined,
        price: parseFloat(String(processedData.price || '0').replace(',', '.')),
        buycost: processedData.buycost !== undefined ? parseFloat(String(processedData.buycost || '0').replace(',', '.')) : undefined,
        stock: processedData.stock !== undefined ? Math.max(0, parseInt(String(processedData.stock), 10)) : 0
      };

      // Validaciones
      if (!productToSend.name) {
        throw new Error('El nombre del producto es requerido');
      }
      
      if (isNaN(productToSend.price) || productToSend.price <= 0) {
        throw new Error('El precio debe ser un número mayor a cero');
      }

      if (productToSend.buycost === undefined || isNaN(productToSend.buycost) || productToSend.buycost <= 0) {
        throw new Error('El costo de compra es obligatorio y debe ser un número mayor a cero');
      }

      // Log de depuración
      console.log('Datos procesados para enviar:', productToSend);
      
      // Realizar la petición
      const response = await api.post<{ data: Product }>('/products/create', productToSend);
      
      console.log('Producto creado exitosamente:', response.data);
      return response.data.data;
      
    } catch (error: unknown) {
      let errorMessage = 'Error al crear el producto. Por favor, intente nuevamente.';
      
      // Log the error with proper type checking
      if (error instanceof Error) {
        console.error('Error en createProduct:', error.message);
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown, status?: number } };
        console.error('Error en createProduct:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        
        const responseData = axiosError.response?.data;
        if (responseData && typeof responseData === 'object') {
          const data = responseData as Record<string, unknown>;
          const message = data.message as string | undefined;
          const errorDetail = data.error as string | undefined;
          const detail = data.detail as string | undefined;
          const errors = data.errors as Record<string, unknown> | undefined;
          
          if (message) errorMessage = message;
          else if (errorDetail) errorMessage = errorDetail;
          else if (detail) errorMessage = detail;
          else if (errors) {
            errorMessage = Object.entries(errors)
              .map(([key, value]) => 
                `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
              )
              .join('; ');
          }
        }
      } else {
        console.error('Error desconocido en createProduct:', error);
      }
      
      throw new Error(errorMessage);
    }
  },

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdBy'>>) {
    try {
      // Asegurarse de que el ID sea un string válido
      if (!id) {
        throw new Error('ID de producto no válido');
      }

      // Obtener información del usuario actual
      const userJson = localStorage.getItem('user');
      const token = localStorage.getItem('auth_token');
      
      if (!userJson || !token) {
        throw new Error('Usuario no autenticado');
      }

      const currentUser = JSON.parse(userJson);
      
      // Extraer solo los campos necesarios y asegurarse de no incluir userId
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, ...cleanProductData } = productData as Record<string, unknown>;
      // userId se extrae pero no se usa, lo cual es intencional
      
      // Crear objeto con solo los campos permitidos
      const updateData: Record<string, unknown> = {};
      
      // Validar y limpiar los campos
      if (cleanProductData.name !== undefined) {
        updateData.name = String(cleanProductData.name).trim();
      }
      
      if (cleanProductData.description !== undefined) {
        updateData.description = String(cleanProductData.description).trim();
      }
      
      if (cleanProductData.price !== undefined) {
        const parsedPrice = parseFloat(String(cleanProductData.price).replace(',', '.'));
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          throw new Error('El precio debe ser un número mayor a cero');
        }
        updateData.price = parsedPrice;
      }
      
      if (cleanProductData.buycost !== undefined) {
        const parsedBuycost = parseFloat(String(cleanProductData.buycost).replace(',', '.'));
        if (isNaN(parsedBuycost) || parsedBuycost <= 0) {
          throw new Error('El costo de compra debe ser un número mayor a cero');
        }
        updateData.buycost = parsedBuycost;
      }
      
      if (cleanProductData.stock !== undefined) {
        updateData.stock = Math.max(0, parseInt(String(cleanProductData.stock), 10));
      }

      console.log('Actualizando producto con datos:', { 
        id, 
        updateData,
        currentUserId: currentUser.id,
        userRole: currentUser.role
      });
      
      // Usar el endpoint exacto según la documentación de Swagger
      const response = await api.patch<Product>(`/products/update/${id}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Producto actualizado exitosamente:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error(`Error actualizando producto ${id}:`, error);
      
      let errorMessage = 'No se pudo actualizar el producto. Por favor, intente nuevamente.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            data?: { message?: string },
            status?: number,
            statusText?: string 
          } 
        };
        
        if (axiosError.response?.status === 403) {
          errorMessage = 'No tienes permiso para modificar este producto. Solo el propietario puede realizar cambios.';
        } else if (axiosError.response?.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        } else if (axiosError.response?.status === 404) {
          errorMessage = 'Producto no encontrado. Por favor, actualice la lista de productos.';
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.statusText) {
          errorMessage = axiosError.response.statusText;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Error detallado:', { 
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      
      throw new Error(errorMessage);
    }
  },

  async deleteProduct(id: string) {
  try {
    console.log(`[Product Service] Attempting to delete product with ID: ${id}`);
    
    // Get the user's token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No se encontró el token de autenticación. Por favor, inicie sesión nuevamente.');
    }

    const response = await api.delete(`/products/remove/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: (status) => status < 600
    });
    
    console.log('[Product Service] Delete response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    if (response.status === 200 || response.status === 204) {
      return response.data || { success: true };
    }
    
    // Handle specific error statuses
    switch (response.status) {
      case 401:
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
      case 403:
        throw new Error('No tiene permisos para eliminar este producto.');
      case 404:
        throw new Error('El producto no fue encontrado o ya ha sido eliminado.');
      case 500:
        console.error('Server error details:', response.data);
        throw new Error('Error en el servidor al intentar eliminar el producto. Por favor, intente nuevamente más tarde.');
      default:
        throw new Error(`Error al eliminar el producto (${response.status}): ${response.statusText}`);
    }
    
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ 
      message?: string; 
      error?: string;
      details?: string;
    }>;
    
    console.error('[Product Service] Error deleting product:', {
      id,
      message: axiosError.message,
      code: axiosError.code,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      responseData: axiosError.response?.data,
      config: {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
      }
    });
    
    // Provide user-friendly error messages
    if (axiosError.response?.data?.error) {
      throw new Error(axiosError.response.data.error);
    } 
    if (axiosError.response?.data?.message) {
      throw new Error(axiosError.response.data.message);
    } 
    if (axiosError.code === 'ECONNABORTED') {
      throw new Error('La solicitud tardó demasiado. Por favor, verifique su conexión e intente nuevamente.');
    }
    if (axiosError.response?.status === 500) {
      const errorDetails = axiosError.response.data?.details || 'Error interno del servidor';
      throw new Error(`Error en el servidor: ${errorDetails}. Por favor, intente nuevamente más tarde.`);
    }
    
    throw new Error('No se pudo eliminar el producto. Por favor, verifique su conexión e intente nuevamente.');
  }
}
};

export type { Product, ProductsResponse } from '@/types/product.types';