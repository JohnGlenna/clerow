import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Has this user already completed a scan? If so, signing back in should drop
// them straight into the dashboard — not back through the scan window.
async function hasCompletedScan(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("scans")
    .select("id, brands!inner(user_id)")
    .eq("brands.user_id", userId)
    .eq("status", "done")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

// Exchanges the code from a magic-link / OAuth redirect for a session, then
// sends the user on. New users (or anyone pasting a fresh URL to scan) go to
// onboarding; returning users who've already scanned skip it for the dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let dest = next;
      // Only override the default onboarding hand-off. If the user pasted a URL
      // (next carries ?url=) they explicitly want a scan, so honour that.
      const nextUrl = new URL(next, url.origin);
      const wantsScan = nextUrl.pathname === "/onboarding" && nextUrl.searchParams.has("url");
      if (nextUrl.pathname === "/onboarding" && !wantsScan) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && (await hasCompletedScan(supabase, user.id))) dest = "/dashboard";
      }
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
