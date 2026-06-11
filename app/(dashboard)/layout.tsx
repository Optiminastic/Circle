import { DashboardShell } from '@/components/DashboardShell';
import { ScheduleProvider } from '@/store/schedule-store';
import { InterviewScheduleProvider } from '@/store/interview-schedule-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ScheduleProvider>
        <InterviewScheduleProvider>{children}</InterviewScheduleProvider>
      </ScheduleProvider>
    </DashboardShell>
  );
}
