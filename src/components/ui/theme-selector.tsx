'use client';

import { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type AppTheme = 'theme-phoenix' | 'theme-light' | 'theme-neutral' | 'theme-ash';

const STORAGE_KEY = 'app-theme';
const DEFAULT_THEME: AppTheme = 'theme-phoenix';
const ALL_THEME_CLASSES: AppTheme[] = ['theme-phoenix', 'theme-light', 'theme-neutral', 'theme-ash'];

const themes: { value: AppTheme; label: string; icon: string; description: string }[] = [
  { value: 'theme-phoenix', label: 'Phoenix',      icon: '🔥', description: 'Rojo fuego (default)'    },
  { value: 'theme-light',   label: 'Zafiro',       icon: '☀️', description: 'Verde esmeralda'         },
  { value: 'theme-neutral', label: 'Profesional',  icon: '💼', description: 'Gris neutro'             },
  { value: 'theme-ash',     label: 'Ceniza',       icon: '🌫️', description: 'Azul oscuro suave'       },
];

export function applyAppTheme(theme: AppTheme) {
  const html = document.documentElement;
  ALL_THEME_CLASSES.forEach((cls) => html.classList.remove(cls));
  if (theme !== 'theme-phoenix') {
    html.classList.add(theme);
  }
}

export function ThemeSelector() {
  const [current, setCurrent] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as AppTheme) || DEFAULT_THEME;
    setCurrent(stored);
    applyAppTheme(stored);
  }, []);

  const selectTheme = (theme: AppTheme) => {
    setCurrent(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    applyAppTheme(theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Cambiar paleta de color">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Paleta de color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Paleta de color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => selectTheme(theme.value)}
            className="cursor-pointer flex items-center justify-between gap-2 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{theme.icon}</span>
              <div>
                <p className="text-sm font-medium leading-none">{theme.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
              </div>
            </div>
            {current === theme.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
