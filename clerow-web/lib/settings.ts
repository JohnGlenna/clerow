// Global, founder-controlled switches stored in public.app_settings (key→jsonb).
// Read with the service-role client (createAdminClient) — the table is
// service-role only (RLS on, no policies). First use is the auto-scan kill
// switch that gates the cron routes and is flipped from the admin Prospect
// Scanner.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Admin = SupabaseClient<Database>;

const AUTO_SCANS_KEY = "auto_scans_enabled";
const AUTO_SEND_KEY = "auto_send_enabled";
const AUTO_SEND_PAUSED_REASON_KEY = "auto_send_paused_reason";

// Absent or anything-but-`true` is treated as OFF, so a missing row never
// causes surprise API spend or an unreviewed email going out.
async function getFlag(admin: Admin, key: string): Promise<boolean> {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value === true;
}

async function setFlag(admin: Admin, key: string, enabled: boolean): Promise<void> {
  const { error } = await admin
    .from("app_settings")
    .upsert({ key, value: enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/**
 * Whether automated scanning (the daily subscriber re-scan and the prospect
 * autopilot cron) is enabled.
 */
export async function getAutoScansEnabled(admin: Admin): Promise<boolean> {
  return getFlag(admin, AUTO_SCANS_KEY);
}

/** Flip the auto-scan kill switch on or off. */
export async function setAutoScansEnabled(admin: Admin, enabled: boolean): Promise<void> {
  return setFlag(admin, AUTO_SCANS_KEY, enabled);
}

/**
 * Whether the outreach auto-send drip cron may send emails. Deliberately a
 * separate switch from auto-scans: drafting can keep running while sending is
 * paused (e.g. vacation, deliverability trouble).
 */
export async function getAutoSendEnabled(admin: Admin): Promise<boolean> {
  return getFlag(admin, AUTO_SEND_KEY);
}

/** Flip the auto-send kill switch on or off. */
export async function setAutoSendEnabled(admin: Admin, enabled: boolean): Promise<void> {
  return setFlag(admin, AUTO_SEND_KEY, enabled);
}

/**
 * Why the drip cron switched auto-send off by itself (e.g. Gmail refused the
 * SMTP login), or null when it didn't. Shown as a warning in the Outbox;
 * cleared when the founder re-enables auto-send.
 */
export async function getAutoSendPausedReason(admin: Admin): Promise<string | null> {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", AUTO_SEND_PAUSED_REASON_KEY)
    .maybeSingle();
  return typeof data?.value === "string" && data.value ? data.value : null;
}

/** Record (string) or clear (null) the auto-send pause reason. */
export async function setAutoSendPausedReason(admin: Admin, reason: string | null): Promise<void> {
  if (reason === null) {
    await admin.from("app_settings").delete().eq("key", AUTO_SEND_PAUSED_REASON_KEY);
    return;
  }
  const { error } = await admin
    .from("app_settings")
    .upsert(
      { key: AUTO_SEND_PAUSED_REASON_KEY, value: reason, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}
