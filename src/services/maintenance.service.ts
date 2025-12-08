import axios, { AxiosRequestConfig } from 'axios';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

interface MaintenanceResponse {
  maintenance: boolean;
}

export const checkMaintenanceStatus = async (): Promise<{ isInMaintenance: boolean; error?: Error }> => {
  const url = `${API_URL}/maintenance/status`;
  
  // Configuración mínima para evitar problemas de CORS
  const config: AxiosRequestConfig = {
    timeout: 3000, // Tiempo de espera de 3 segundos
    // No incluir cabeceras personalizadas que puedan causar problemas de CORS
  };

  try {
    const response = await axios.get<MaintenanceResponse>(url, config);
    // Mapeamos la respuesta del backend a la estructura esperada
    return { isInMaintenance: response.data?.maintenance === true };
  } catch (error: unknown) {
    console.error('Error checking maintenance status:', error);
    // Si hay un error de red o CORS, asumimos que no estamos en mantenimiento
    // para no bloquear la aplicación innecesariamente
    const errorObj = error instanceof Error ? error : new Error('Error desconocido al verificar el estado de mantenimiento');
    return { isInMaintenance: false, error: errorObj };
  }
};
