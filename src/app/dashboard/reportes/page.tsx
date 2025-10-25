import { PageHeader } from '@/components/page-header';

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Genera y visualiza reportes de tu negocio"
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Accede a informes detallados sobre ventas, inventario y rendimiento del negocio.
        </p>
      </div>
    </div>
  );
}
