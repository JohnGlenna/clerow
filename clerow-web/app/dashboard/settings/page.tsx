import { AppShell } from "@/components/dashboard/AppShell";
import { PageSettings } from "@/components/dashboard/PageSettings";

export default function SettingsPage() {
  return (
    <AppShell page="settings">
      <PageSettings />
    </AppShell>
  );
}
