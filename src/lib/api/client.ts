// src/lib/api/client.ts
// Importar el servicio API centralizado en lugar de duplicar la configuración
import { api } from '@/services/api';

// Exportar como default para mantener compatibilidad con imports existentes
export default api;