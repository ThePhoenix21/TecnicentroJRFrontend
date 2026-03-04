import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { api } from './api';

export type ActiveLoginMode = 'STORE' | 'WAREHOUSE';

type DomainPath = {
  store: string;
  warehouse?: string;
};

type DomainRequestConfig = AxiosRequestConfig & {
  allowWithoutMode?: boolean;
};

const FORBIDDEN_IN_WAREHOUSE_PATTERNS: RegExp[] = [
  /^\/cash-session(\/|$)/,
  /^\/cash-movement(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/services\/fast(\/|$)/,
  /^\/ventas(\/|$)/,
];

const ensureLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const readUserFromStorage = (): { activeLoginMode?: string | null } | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as { activeLoginMode?: string | null };
  } catch {
    return null;
  }
};

export const getActiveLoginMode = (): ActiveLoginMode | null => {
  const user = readUserFromStorage();
  const mode = user?.activeLoginMode;
  if (mode === 'STORE' || mode === 'WAREHOUSE') return mode;
  return null;
};

export const resolveDomainPrefix = (mode: ActiveLoginMode | null): string => {
  return mode === 'WAREHOUSE' ? '/warehouse' : '';
};

export const resolveDomainPath = (
  path: string | DomainPath,
  mode: ActiveLoginMode,
): string => {
  if (typeof path === 'string') {
    return ensureLeadingSlash(path);
  }

  if (mode === 'WAREHOUSE') {
    if (!path.warehouse) {
      throw new Error('Este endpoint no está disponible para modo WAREHOUSE.');
    }
    return ensureLeadingSlash(path.warehouse);
  }

  return ensureLeadingSlash(path.store);
};

const validateDomainPath = (mode: ActiveLoginMode, path: string) => {
  if (mode === 'STORE' && path.startsWith('/warehouse/')) {
    throw new Error('No se permite usar endpoints /warehouse/* en modo STORE.');
  }

  if (mode === 'WAREHOUSE') {
    const isWarehouseScope = path.startsWith('/warehouse/');
    const isWarehousesTenantScope = path.startsWith('/warehouses/');

    if (!isWarehouseScope && !isWarehousesTenantScope) {
      throw new Error('Endpoint no permitido en modo WAREHOUSE.');
    }

    // Solo aplicar reglas de "forbidden" a endpoints dentro del scope /warehouse/* (contexto activo)
    if (!isWarehouseScope) return;

    const unprefixed = path.replace(/^\/warehouse/, '') || '/';
    const forbidden = FORBIDDEN_IN_WAREHOUSE_PATTERNS.some((pattern) => pattern.test(unprefixed));
    if (forbidden) {
      throw new Error('Este endpoint no está permitido en modo WAREHOUSE.');
    }
  }
};

const getModeOrThrow = (allowWithoutMode?: boolean): ActiveLoginMode | null => {
  const mode = getActiveLoginMode();
  if (!mode && !allowWithoutMode) {
    throw new Error('No hay contexto activo. Selecciona STORE o WAREHOUSE antes de continuar.');
  }
  return mode;
};

const resolveRequestPath = (
  path: string | DomainPath,
  config?: DomainRequestConfig,
): string => {
  const mode = getModeOrThrow(config?.allowWithoutMode);
  if (!mode) {
    if (typeof path === 'string') return ensureLeadingSlash(path);
    return ensureLeadingSlash(path.store);
  }

  const resolvedPath = resolveDomainPath(path, mode);
  validateDomainPath(mode, resolvedPath);
  return resolvedPath;
};

const buildWarehouseHeaders = (resolvedPath: string): Record<string, string> => {
  if (!resolvedPath.startsWith('/warehouse/')) return {};
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem('current_warehouse');
    if (!raw) throw new Error('No hay almacén activo en sesión');
    const warehouse = JSON.parse(raw) as { id?: string };
    if (!warehouse?.id) throw new Error('No hay almacén activo en sesión');
    return { 'x-warehouse-id': warehouse.id };
  } catch (err) {
    if (err instanceof Error && err.message === 'No hay almacén activo en sesión') {
      throw err;
    }
    throw new Error('No hay almacén activo en sesión');
  }
};

const mergeWarehouseHeaders = (
  resolvedPath: string,
  config?: DomainRequestConfig,
): DomainRequestConfig => {
  const warehouseHeaders = buildWarehouseHeaders(resolvedPath);
  if (Object.keys(warehouseHeaders).length === 0) return config ?? {};
  return {
    ...config,
    headers: {
      ...config?.headers,
      ...warehouseHeaders,
    },
  };
};

export const domainApi = {
  get<T = unknown>(path: string | DomainPath, config?: DomainRequestConfig): Promise<AxiosResponse<T>> {
    const resolvedPath = resolveRequestPath(path, config);
    return api.get<T>(resolvedPath, mergeWarehouseHeaders(resolvedPath, config));
  },

  post<T = unknown, B = unknown>(path: string | DomainPath, data?: B, config?: DomainRequestConfig): Promise<AxiosResponse<T>> {
    const resolvedPath = resolveRequestPath(path, config);
    return api.post<T>(resolvedPath, data, mergeWarehouseHeaders(resolvedPath, config));
  },

  put<T = unknown, B = unknown>(path: string | DomainPath, data?: B, config?: DomainRequestConfig): Promise<AxiosResponse<T>> {
    const resolvedPath = resolveRequestPath(path, config);
    return api.put<T>(resolvedPath, data, mergeWarehouseHeaders(resolvedPath, config));
  },

  patch<T = unknown, B = unknown>(path: string | DomainPath, data?: B, config?: DomainRequestConfig): Promise<AxiosResponse<T>> {
    const resolvedPath = resolveRequestPath(path, config);
    return api.patch<T>(resolvedPath, data, mergeWarehouseHeaders(resolvedPath, config));
  },

  delete<T = unknown>(path: string | DomainPath, config?: DomainRequestConfig): Promise<AxiosResponse<T>> {
    const resolvedPath = resolveRequestPath(path, config);
    return api.delete<T>(resolvedPath, mergeWarehouseHeaders(resolvedPath, config));
  },
};

export const ensureStoreMode = () => {
  const mode = getActiveLoginMode();
  if (mode === 'WAREHOUSE') {
    throw new Error('Esta operación solo está disponible en modo STORE.');
  }
};
