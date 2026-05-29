import { redirect } from "next/navigation";

// Onboarding is now a single step at /onboarding. Old per-step links
// (/onboarding/1..4) redirect there, preserving any ?url= the landing page set.
export default async function OnboardingStepPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  redirect(url ? `/onboarding?url=${encodeURIComponent(url)}` : "/onboarding");
}
