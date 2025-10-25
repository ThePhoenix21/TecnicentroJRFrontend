'use client';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

type TabValue = 'general' | 'usuarios' | 'seguridad' | 'sistema';

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'sistema', label: 'Sistema' },
] as const;

export default function ConfiguracionPage() {
  const pathname = usePathname();
  const activeTab = pathname.split('/').pop() as TabValue || 'general';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra la configuración del sistema y los usuarios"
      />

      <Tabs defaultValue="general" value={activeTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          {tabs.map((tab) => (
            <Link href={`/dashboard/configuracion/${tab.id}`} key={tab.id} className="w-full">
              <TabsTrigger value={tab.id} className="w-full">
                {tab.label}
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-medium mb-4">Configuración General</h3>
            <p className="text-muted-foreground">
              Configura los ajustes generales de la aplicación.
            </p>
            <div className="mt-4">
              <Link 
                href="/dashboard/configuracion/general" 
                className="text-primary hover:underline inline-flex items-center"
              >
                Ver configuración general <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-medium mb-4">Gestión de Usuarios</h3>
            <p className="text-muted-foreground mb-4">
              Administra los usuarios y sus permisos en el sistema.
            </p>
            <div className="h-[500px] flex items-center justify-center border rounded-lg bg-muted/30">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Módulo de gestión de usuarios
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link 
                    href="/dashboard/configuracion/usuarios" 
                    className="text-primary hover:underline"
                  >
                    Ver todos los usuarios
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seguridad" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-medium mb-4">Seguridad</h3>
            <p className="text-muted-foreground">
              Configura los parámetros de seguridad del sistema.
            </p>
            {/* Add security settings form here */}
          </div>
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-medium mb-4">Sistema</h3>
            <p className="text-muted-foreground">
              Configuración avanzada del sistema.
            </p>
            {/* Add system settings form here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
