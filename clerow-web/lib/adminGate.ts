// Founder/admin gate for internal tools (/admin/*). There is no role system —
// admins are the emails in the ADMIN_EMAILS env var (comma-separated).

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** The logged-in user if (and only if) they are an admin, else null. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
