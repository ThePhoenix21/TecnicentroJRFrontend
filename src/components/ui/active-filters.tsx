'use client';

import { Button } from '@/components/ui/button';

interface ActiveFiltersProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  className?: string;
}

export function ActiveFilters({ 
  hasActiveFilters, 
  onClearFilters, 
  className = "" 
}: ActiveFiltersProps) {
  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between text-xs text-muted-foreground ${className}`}>
      <span className="font-semibold tracking-wide">Filtros activos</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-7 px-2 text-amber-600 hover:text-red-300"
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
