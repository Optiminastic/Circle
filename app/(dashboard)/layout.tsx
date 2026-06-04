import { DashboardShell } from '@/components/DashboardShell';
import { ScheduleProvider } from '@/store/schedule-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ScheduleProvider>{children}</ScheduleProvider>
    </DashboardShell>
  );
}
