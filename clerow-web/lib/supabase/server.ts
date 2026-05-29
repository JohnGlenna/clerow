import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Returns a Supabase client scoped to the current request's user. Two auth
// modes, so the same API routes serve both the web app and the mobile app:
//
//  - Web: the session lives in cookies (set by @supabase/ssr). RLS runs as the
//    signed-in user; the session is refreshed via middleware.
//  - Mobile: React Native can't use those cookies, so it sends the Supabase
//    access token as `Authorization: Bearer <jwt>`. We hand that straight to a
//    token-scoped client — `auth.getUser()` validates the JWT and PostgREST/RLS
//    run as that user. Native apps aren't browsers, so CORS doesn't apply.
export async function createClient() {
  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return createTokenClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
