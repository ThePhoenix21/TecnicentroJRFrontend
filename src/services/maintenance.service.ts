// STUB: El modo mantenimiento ahora se maneja solo con interceptor global
export const checkMaintenanceStatus = async (): Promise<{ isInMaintenance: boolean; error?: Error }> => {
  return { isInMaintenance: false };
};
