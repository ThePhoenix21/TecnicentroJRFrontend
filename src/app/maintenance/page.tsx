import MaintenanceMode from '@/components/maintenance/maintenance-mode';

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <MaintenanceMode />
      </div>
    </main>
  );
}
