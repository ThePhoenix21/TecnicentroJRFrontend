import axios from "axios";

export interface ApiQueryParams {
  from?: string;
  to?: string;
  timeZone?: string;
  storeId?: string;
  compareFrom?: string;
  compareTo?: string;
}

export interface ApiRequestError {
  status?: number;
  message: string;
}

export function buildQueryParams(params: ApiQueryParams): ApiQueryParams {
  const normalized: ApiQueryParams = {};

  if (params.from) normalized.from = params.from;
  if (params.to) normalized.to = params.to;
  if (params.timeZone) normalized.timeZone = params.timeZone;
  if (params.storeId) normalized.storeId = params.storeId;
  if (params.compareFrom) normalized.compareFrom = params.compareFrom;
  if (params.compareTo) normalized.compareTo = params.compareTo;

  return normalized;
}

export function validateCompareRange(params: ApiQueryParams): void {
  const hasCompareFrom = Boolean(params.compareFrom);
  const hasCompareTo = Boolean(params.compareTo);

  if (hasCompareFrom !== hasCompareTo) {
    const error = new Error(
      "El periodo comparativo es atómico: compareFrom y compareTo deben enviarse juntos."
    ) as Error & { status?: number };
    error.status = 400;
    throw error;
  }
}

export function validateRequiredRange(params: ApiQueryParams, endpoint: string): void {
  if (!params.from || !params.to) {
    const error = new Error(
      `El endpoint ${endpoint} requiere los parámetros from y to.`
    ) as Error & { status?: number };
    error.status = 400;
    throw error;
  }
}

export function normalizeApiError(error: unknown): ApiRequestError {
  if (!axios.isAxiosError(error)) {
    const fallbackError = error as { status?: number; message?: string };
    return {
      status: fallbackError?.status,
      message: fallbackError?.message ?? "Error inesperado.",
    };
  }

  const status = error.response?.status;

  if (status === 400) {
    return { status, message: "Solicitud inválida (400). Verifica rango y parámetros." };
  }

  if (status === 401) {
    return { status, message: "Sesión inválida o expirada (401)." };
  }

  if (status === 403) {
    return { status, message: "No tienes permisos para este recurso (403)." };
  }

  if (status === 429) {
    return { status, message: "Límite de solicitudes excedido (429)." };
  }

  return {
    status,
    message: error.response?.data?.message ?? error.message ?? "No se pudo completar la solicitud.",
  };
}
