import { AppShell } from "@/components/dashboard/AppShell";
import { PagePrompts } from "@/components/dashboard/PagePrompts";

export default function PromptsPage() {
  return (
    <AppShell page="prompts">
      <PagePrompts />
    </AppShell>
  );
}
