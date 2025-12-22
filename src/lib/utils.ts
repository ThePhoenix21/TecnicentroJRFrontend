import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export type SupportedCurrency = 'PEN' | 'USD' | 'EUR'

export const CURRENCY_STORAGE_KEY = 'tenant_currency'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency?: SupportedCurrency): string {
  const effectiveCurrency: SupportedCurrency = (() => {
    if (currency) return currency
    if (typeof window === 'undefined') return 'PEN'
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (stored === 'PEN' || stored === 'USD' || stored === 'EUR') return stored
    return 'PEN'
  })()

  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: effectiveCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
