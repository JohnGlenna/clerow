import { AppShell } from "@/components/dashboard/AppShell";
import { PageSources } from "@/components/dashboard/PageSources";

export default function SourcesPage() {
  return (
    <AppShell page="sources">
      <PageSources />
    </AppShell>
  );
}
