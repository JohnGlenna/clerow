import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { createClient } from "@/lib/supabase/server";

// A returning user who's already scanned should never see the scan window —
// even if they land here directly. We only keep them on onboarding when they
// explicitly pass a URL to (re)scan.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  if (!url) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: scan } = await supabase
        .from("scans")
        .select("id, brands!inner(user_id, is_prospect)")
        .eq("brands.user_id", user.id)
        .eq("brands.is_prospect", false)
        .eq("status", "done")
        .limit(1)
        .maybeSingle();
      if (scan) redirect("/dashboard");
    }
  }

  return <Onboarding />;
}
