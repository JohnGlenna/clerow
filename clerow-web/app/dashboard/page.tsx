import { AppShell } from "@/components/dashboard/AppShell";
import { PageOverview } from "@/components/dashboard/PageOverview";

export default function DashboardOverviewPage() {
  return (
    <AppShell page="overview">
      <PageOverview />
    </AppShell>
  );
}
