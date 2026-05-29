import { AppShell } from "@/components/dashboard/AppShell";
import { PageReports } from "@/components/dashboard/PageReports";

export default function ReportsPage() {
  return (
    <AppShell page="reports">
      <PageReports />
    </AppShell>
  );
}
