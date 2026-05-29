import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PromptIntent, PromptVolume } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTENTS: PromptIntent[] = ["solution", "compare", "problem", "branded"];
const VOLUMES: PromptVolume[] = ["high", "medium", "low", "rising"];

// Track a new prompt (from the AI-suggested tab). Inserts a user-sourced,
// tracked prompt for the signed-in user's brand. Idempotent on text.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const intent: PromptIntent = INTENTS.includes(body.intent) ? body.intent : "solution";
  const volume: PromptVolume = VOLUMES.includes(body.volume) ? body.volume : "medium";

  const { data: existing } = await supabase
    .from("prompts")
    .select("id")
    .eq("brand_id", brand.id)
    .ilike("text", text)
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ prompt: existing, created: false });

  const { data, error } = await supabase
    .from("prompts")
    .insert({ brand_id: brand.id, text, intent, volume, source: "user", is_tracked: true })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data, created: true });
}
