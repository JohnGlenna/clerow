// Global, founder-controlled switches stored in public.app_settings (key→jsonb).
// Read with the service-role client (createAdminClient) — the table is
// service-role only (RLS on, no policies). First use is the auto-scan kill
// switch that gates the cron routes and is flipped from the admin Prospect
// Scanner.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Admin = SupabaseClient<Database>;

const AUTO_SCANS_KEY = "auto_scans_enabled";

/**
 * Whether automated scanning (the daily subscriber re-scan and the prospect
 * autopilot cron) is enabled. Absent or anything-but-`true` is treated as OFF,
 * so a missing row never causes surprise API spend.
 */
export async function getAutoScansEnabled(admin: Admin): Promise<boolean> {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", AUTO_SCANS_KEY)
    .maybeSingle();
  return data?.value === true;
}

/** Flip the auto-scan kill switch on or off. */
export async function setAutoScansEnabled(admin: Admin, enabled: boolean): Promise<void> {
  const { error } = await admin
    .from("app_settings")
    .upsert(
      { key: AUTO_SCANS_KEY, value: enabled, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}
