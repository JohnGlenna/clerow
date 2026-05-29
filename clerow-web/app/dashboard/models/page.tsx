import { AppShell } from "@/components/dashboard/AppShell";
import { PageModels } from "@/components/dashboard/PageModels";

export default function ModelsPage() {
  return (
    <AppShell page="models">
      <PageModels />
    </AppShell>
  );
}
