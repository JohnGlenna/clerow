import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPromptScan } from "@/lib/scan/run";
import { streamScan, STREAM_HEADERS } from "@/lib/scan/events";
import { synthesizeAndStore } from "@/lib/scan/synthesize";
import { loadBrandSnapshot } from "@/lib/scan/snapshot";
import { refreshSiteAudit } from "@/lib/audit/ensure";
import { enrichFromUpload, mergeUploadEnrichment } from "@/lib/scan/enrichFromUpload";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";
import { planFromSub, enginesForPlan, assertBudget, BudgetExceededError } from "@/lib/billing/limits";
import { enabledEngines } from "@/lib/engines";
import { costForEngines } from "@/lib/billing/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// How many of the brand's prompts a full scan runs across every model. Bounds
// COGS and wall-clock: prompts run sequentially, each across all engines.
const MAX_SCAN_PROMPTS = 5;

// The comprehensive "Scan all 5 models" action — refreshes data for the WHOLE
// ladder in one pass: (1) re-crawl the site audit (cheap → Levels 1-2 data),
// then (2) run the brand's top prompts across the plan's engines (paid →
// Levels 3-4 data + score). Subscription- and budget-gated.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sub = await getSubscription(supabase, user.id);
  if (!isSubscribed(sub)) {
    return NextResponse.json({ error: "Subscription required to re-scan." }, { status: 402 });
  }
  const plan = planFromSub(sub);
  const engines = enabledEngines(enginesForPlan(plan));
  if (engines.length === 0) {
    return NextResponse.json({ error: "No AI engines are configured." }, { status: 502 });
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  // Primary prompt first, then by search volume — the queries that matter most.
  const { data: prompts } = await supabase
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brand.id)
    .order("is_primary", { ascending: false })
    .order("volume", { ascending: false })
    .limit(MAX_SCAN_PROMPTS);
  if (!prompts || prompts.length === 0) {
    return NextResponse.json({ error: "No prompts to scan yet." }, { status: 400 });
  }

  // Don't start a scan while one is already running for this brand.
  const inFlightSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: running } = await supabase
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id)
    .eq("status", "running")
    .gte("started_at", inFlightSince);
  if (running && running > 0) {
    return NextResponse.json({ error: "A scan is already running — give it a moment." }, { status: 429 });
  }

  // Budget guard up front for the whole batch (one full scan per prompt) so "out
  // of scans" surfaces as a clean 402 before we commit to a streamed 200.
  // runPromptScan re-checks per prompt as spend accrues. (The site crawl is free.)
  try {
    await assertBudget(supabase, user.id, plan, costForEngines(engines) * prompts.length, new Date());
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        { error: "You're out of scans for this month. Upgrade for more.", budget: err.status, code: "budget" },
        { status: 402 },
      );
    }
    throw err;
  }

  const total = prompts.length;

  return new Response(
    streamScan(async (emit) => {
      // (0) Distill the user's uploaded business context (screenshots + about
      // text) into the brand profile, when present and not yet applied. Sharpens
      // detection + the AI-fix content this scan's tasks will generate, and is the
      // fallback when the crawl can't read a site. Best-effort — a vision/Storage
      // failure must not abort the scan. (Re-runs only when context changed:
      // POST /api/brand/context bumps updated_at past context_enriched_at.)
      try {
        const hasContext = (brand.screenshots?.length ?? 0) > 0 || (brand.about ?? "").trim().length > 0;
        const stale = !brand.context_enriched_at || new Date(brand.context_enriched_at) < new Date(brand.updated_at);
        if (hasContext && stale) {
          const admin = createAdminClient();
          const images: { mediaType: string; data: string }[] = [];
          for (const path of (brand.screenshots ?? []).slice(0, 6)) {
            const { data: blob } = await admin.storage.from("brand-uploads").download(path);
            if (!blob) continue;
            images.push({ mediaType: blob.type || "image/jpeg", data: Buffer.from(await blob.arrayBuffer()).toString("base64") });
          }
          const e = await enrichFromUpload({
            profile: {
              url: brand.url, company: brand.company, industry: brand.industry, description: brand.description,
              location: brand.location, audience: brand.audience, competitors: brand.competitors,
              differentiators: brand.differentiators, geos: brand.geos, enrichNotes: brand.enrich_notes,
            },
            about: brand.about ?? "",
            images,
          });
          const patch = mergeUploadEnrichment(
            { industry: brand.industry, description: brand.description, audience: brand.audience, differentiators: brand.differentiators, competitors: brand.competitors },
            e,
          );
          await supabase.from("brands").update({ ...patch, context_enriched_at: new Date().toISOString() }).eq("id", brand.id);
        }
      } catch {
        // best-effort — scan proceeds on the existing profile.
      }

      // (1) Re-crawl the site audit so Levels 1-2 reflect the current site. Cheap
      // and best-effort — a crawl failure must not abort the paid AI scan.
      try {
        await refreshSiteAudit(supabase, brand.id, brand.url);
      } catch {
        // keep going; the dashboard falls back to the prior audit.
      }

      // (2) Scan prompts one at a time so progress reads cleanly; engines within
      // each prompt run concurrently inside runPromptScan.
      const scanIds: string[] = [];
      for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        // Announce the prompt up front so its query + model rows render before any
        // engine ticks. Engine events carry promptId for grouping.
        emit({ type: "prompt", promptId: p.id, text: p.text, index: i, total });
        try {
          const result = await runPromptScan(supabase, brand.id, p.id, engines, emit);
          scanIds.push(result.scanId);
        } catch {
          // One prompt failing (e.g. all engines down for it) shouldn't abort the
          // batch — its engine "failed" events already streamed via onEvent.
        }
      }

      // Master-AI synthesis per scan in the background so the score lands now and
      // the collective verdict fills in for the next dashboard load.
      after(async () => {
        const admin = createAdminClient();
        for (const id of scanIds) {
          try {
            await synthesizeAndStore(admin, id);
          } catch {
            // Service role not configured — verdict simply stays null.
          }
        }
      });

      const snapshot = await loadBrandSnapshot(supabase, brand.id);
      emit({ type: "done", result: { scanId: scanIds[scanIds.length - 1] ?? "", score: snapshot.score } });
    }),
    { headers: STREAM_HEADERS },
  );
}
