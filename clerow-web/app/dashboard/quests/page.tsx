import { AppShell } from "@/components/dashboard/AppShell";
import { PageQuests } from "@/components/dashboard/PageQuests";

export default function QuestsPage() {
  return (
    <AppShell page="quests">
      <PageQuests />
    </AppShell>
  );
}
