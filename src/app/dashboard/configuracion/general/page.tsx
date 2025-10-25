'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const themeOptions = [
  {
    value: 'light',
    label: 'Claro',
    icon: Sun,
    description: 'Tema claro para ambientes con buena iluminación',
  },
  {
    value: 'dark',
    label: 'Oscuro',
    icon: Moon,
    description: 'Tema oscuro para reducir la fatiga visual',
  },
  {
    value: 'system',
    label: 'Sistema',
    icon: Monitor,
    description: 'Usar la configuración de tema del sistema operativo',
  },
] as const;

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración General</h2>
        <p className="text-muted-foreground">
          Personaliza la apariencia y comportamiento de la aplicación.
        </p>
      </div>

      <Tabs defaultValue="apariencia" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="idioma">Idioma</TabsTrigger>
        </TabsList>

        <TabsContent value="apariencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tema</CardTitle>
              <CardDescription>
                Personaliza cómo se ve la aplicación en tu dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={`flex flex-col items-center justify-between rounded-lg border p-4 text-center transition-all hover:bg-accent hover:text-accent-foreground ${
                        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/20'
                      }`}
                    >
                      <div className="mb-3 rounded-md bg-muted p-3">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="font-medium">{option.label}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibir notificaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Próximamente: Configuración de notificaciones
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idioma" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Idioma</CardTitle>
              <CardDescription>
                Selecciona tu idioma preferido para la interfaz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Próximamente: Selección de idioma
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
