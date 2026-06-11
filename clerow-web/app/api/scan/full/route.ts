import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scanTopPrompts, MAX_SCAN_PROMPTS } from '@/lib/scan/run';
import { streamScan, STREAM_HEADERS } from '@/lib/scan/events';
import { synthesizeAndStore } from '@/lib/scan/synthesize';
import { loadBrandSnapshot } from '@/lib/scan/snapshot';
import { claimScan, releaseScan } from '@/lib/scan/claim';
import { refreshSiteAudit } from '@/lib/audit/ensure';
import { enrichFromUpload, mergeUploadEnrichment } from '@/lib/scan/enrichFromUpload';
import { gradeSite } from '@/lib/scan/pageGrade';
import type { Json } from '@/lib/supabase/database.types';

// Fetch the homepage HTML for the AI page-grader (best-effort; "" when blocked,
// in which case the grader works from uploaded screenshots).
async function fetchHomepageHtml(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(u, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ClerowAudit/1.0; +https://clerow.com/bot)',
        accept: 'text/html',
      },
    });
    clearTimeout(timer);
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}
import { getSubscription, isSubscribed } from '@/lib/billing/subscription';
import {
  planFromSub,
  enginesForPlan,
  assertBudget,
  BudgetExceededError,
} from '@/lib/billing/limits';
import { enabledEngines } from '@/lib/engines';
import { costForEngines } from '@/lib/billing/cost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// The comprehensive "Scan all 5 models" action — refreshes data for the WHOLE
// ladder in one pass: (1) re-crawl the site audit (cheap → Levels 1-2 data),
// then (2) run the brand's top prompts across the plan's engines (paid →
// Levels 3-4 data + score). Subscription- and budget-gated.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sub = await getSubscription(supabase, user.id);
  if (!isSubscribed(sub)) {
    return NextResponse.json({ error: 'Subscription required to re-scan.' }, { status: 402 });
  }
  const plan = planFromSub(sub);
  const engines = enabledEngines(enginesForPlan(plan));
  if (engines.length === 0) {
    return NextResponse.json({ error: 'No AI engines are configured.' }, { status: 502 });
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: 'No brand' }, { status: 400 });

  // Primary prompt first, then by search volume — the queries that matter most.
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, text')
    .eq('brand_id', brand.id)
    .order('is_primary', { ascending: false })
    .order('volume', { ascending: false })
    .limit(MAX_SCAN_PROMPTS);
  if (!prompts || prompts.length === 0) {
    return NextResponse.json({ error: 'No prompts to scan yet.' }, { status: 400 });
  }

  // Budget guard up front for the whole batch (one full scan per prompt) so "out
  // of scans" surfaces as a clean 402 before we commit to a streamed 200.
  // runPromptScan re-checks per prompt as spend accrues. (The site crawl is free.)
  try {
    await assertBudget(
      supabase,
      user.id,
      plan,
      costForEngines(engines) * prompts.length,
      new Date(),
    );
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json(
        {
          error: "You're out of scans for this month. Upgrade for more.",
          budget: err.status,
          code: 'budget',
        },
        { status: 402 },
      );
    }
    throw err;
  }

  // Atomic claim shared with the MCP's run_full_scan — exactly one concurrent
  // scan start per brand, whichever surface it comes from. Released in the
  // stream's finally.
  if (!(await claimScan(supabase, brand.id))) {
    return NextResponse.json(
      { error: 'A scan is already running — give it a moment.' },
      { status: 429 },
    );
  }

  return new Response(
    streamScan(async (emit) => {
      try {
        const admin = createAdminClient();
        const profile = {
          url: brand.url,
          company: brand.company,
          industry: brand.industry,
          description: brand.description,
          location: brand.location,
          audience: brand.audience,
          competitors: brand.competitors,
          differentiators: brand.differentiators,
          geos: brand.geos,
          enrichNotes: brand.enrich_notes,
        };

        // Download the user's uploaded screenshots once — shared by enrichment + the
        // AI page-grade (and they're the fallback when the site can't be crawled).
        const images: { mediaType: string; data: string }[] = [];
        for (const path of (brand.screenshots ?? []).slice(0, 6)) {
          try {
            const { data: blob } = await admin.storage.from('brand-uploads').download(path);
            if (blob)
              images.push({
                mediaType: blob.type || 'image/jpeg',
                data: Buffer.from(await blob.arrayBuffer()).toString('base64'),
              });
          } catch {
            // skip an unreadable object
          }
        }

        // (0) Distill uploaded business context into the brand profile when it
        // changed (sharpens detection + generated fixes). Best-effort.
        try {
          const hasContext = images.length > 0 || (brand.about ?? '').trim().length > 0;
          const stale =
            !brand.context_enriched_at ||
            new Date(brand.context_enriched_at) < new Date(brand.updated_at);
          if (hasContext && stale) {
            const e = await enrichFromUpload({ profile, about: brand.about ?? '', images });
            const patch = mergeUploadEnrichment(
              {
                industry: brand.industry,
                description: brand.description,
                audience: brand.audience,
                differentiators: brand.differentiators,
                competitors: brand.competitors,
              },
              e,
            );
            await supabase
              .from('brands')
              .update({ ...patch, context_enriched_at: new Date().toISOString() })
              .eq('id', brand.id);
          }
        } catch {
          // best-effort — scan proceeds on the existing profile.
        }

        // (1) Re-crawl the site audit so Levels 1-2 reflect the current site.
        emit({ type: 'phase', phase: 'reading-site' });
        let audit = null as Awaited<ReturnType<typeof refreshSiteAudit>> | null;
        try {
          audit = await refreshSiteAudit(supabase, brand.id, brand.url);
        } catch {
          // keep going; the dashboard falls back to the prior audit.
        }

        // (1b) AI page-grade: an LLM reads the homepage HTML + screenshots and grades
        // the on-page/content criteria the regex audit can't (answer-first, EEAT, …).
        // Merge its findings into the stored audit so Levels 1-2 become page-specific.
        // Best-effort — failure leaves the regex audit intact.
        emit({ type: 'phase', phase: 'grading-pages' });
        try {
          if (audit) {
            const html = await fetchHomepageHtml(brand.url);
            if (html || images.length) {
              const graded = await gradeSite({ brand: profile, html, images, pages: audit?.crawl?.pages ?? [] });
              if (graded.length) {
                const byId = new Map(audit.checks.map((c) => [c.id, c]));
                for (const g of graded) byId.set(g.id, g); // AI overrides/append by id
                audit = { ...audit, checks: [...byId.values()] };
                await supabase
                  .from('brands')
                  .update({ site_audit: audit as unknown as Json })
                  .eq('id', brand.id);
              }
            }
          }
        } catch {
          // best-effort — keep the regex audit.
        }

        // Surface the website-scan result to the client (the results screen leads with it).
        if (audit) {
          emit({
            type: 'site',
            checks: audit.checks.map((c) => ({ id: c.id, label: c.label, status: c.status })),
          });
        }

        // (2) Scan prompts one at a time so progress reads cleanly; engines within
        // each prompt run concurrently inside runPromptScan. Shared with the MCP's
        // run_full_scan tool via scanTopPrompts.
        emit({ type: 'phase', phase: 'scanning' });
        const scanIds = await scanTopPrompts(supabase, brand.id, engines, { onEvent: emit });

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
        emit({
          type: 'done',
          result: { scanId: scanIds[scanIds.length - 1] ?? '', score: snapshot.score },
        });
      } finally {
        await releaseScan(supabase, brand.id);
      }
    }),
    { headers: STREAM_HEADERS },
  );
}
