import "./_loadenv"; // MUST be first

import { createClient } from "@supabase/supabase-js";
import { enrichFromUrl } from "../lib/scan/enrich";
import { runFreeScan, runPromptScan } from "../lib/scan/run";
import { loadBrandSnapshot } from "../lib/scan/snapshot";
import { assembleLadderContext } from "../lib/scan/ladderContext";
import { buildLadder } from "../lib/ladder";
import { refreshSiteAudit } from "../lib/audit/ensure";
import { gradeSite } from "../lib/scan/pageGrade";
import { enabledEngines, PAID_ENGINES } from "../lib/engines";

const EMAIL = "john.7bc@hotmail.com";
const SITE = process.argv[2] || "https://vlvet.co/";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const h = (s: string) => console.log("\n" + "=".repeat(64) + "\n" + s + "\n" + "=".repeat(64));

async function main() {
  // ---- 1. create or reuse john (fresh brand each run) ----
  h("1. USER  (site: " + SITE + ")");
  let userId: string;
  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: "Warbls-test-1234!",
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
    console.log("created user:", EMAIL, userId);
  } else {
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list.users.find((x) => x.email === EMAIL);
    if (!u) throw new Error("user neither created nor found");
    userId = u.id;
    console.log("reusing user:", EMAIL, userId);
    // start fresh: drop the prior brand (cascades prompts/scans/tasks) + subscription
    await admin.from("subscriptions").delete().eq("user_id", userId);
    await admin.from("brands").delete().eq("user_id", userId);
    console.log("cleared prior brand + subscription");
  }

  // ---- 2. brand (mirrors POST /api/brand) ----
  h("2. CREATE BRAND (enrich from URL)");
  const e = await enrichFromUrl(SITE);
  console.log("enrichment:", JSON.stringify(e));
  const { data: brand, error: be } = await admin
    .from("brands")
    .insert({
      user_id: userId,
      url: SITE,
      company: e.company,
      industry: e.industry,
      description: e.description,
      competitors: e.competitors,
    })
    .select("*")
    .single();
  if (be || !brand) throw new Error("brand insert failed: " + be?.message);
  console.log("brand:", brand.id, "|", brand.company, "|", brand.industry);

  // ---- 3. FIRST SCAN — free reveal (Perplexity, one primary prompt) ----
  h("3. FIRST SCAN  (free tier → Perplexity only, 1 prompt)");
  const { result: free, appendCompetitors } = await runFreeScan(admin, brand.id);
  await appendCompetitors(admin);
  console.log("engine:", free.engine);
  console.log("prompt:", free.prompt);
  console.log("you   :", JSON.stringify(free.you));
  console.log("ranked:", free.brands.map((b) => `#${b.rank} ${b.name}${b.isYou ? " (YOU)" : ""}`).join("  |  "));
  console.log("citations:", free.citations.length);

  const { count: promptCount } = await admin
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id);
  console.log("prompts discovered:", promptCount);

  // ---- 4. subscribe john → Premium (so the paid full scan is allowed) ----
  h("4. SUBSCRIBE john → Premium (active)");
  const { error: se } = await admin.from("subscriptions").upsert(
    { user_id: userId, status: "active", plan: "founder", stripe_customer_id: "test_" + userId.slice(0, 8) },
    { onConflict: "user_id" },
  );
  if (se) throw new Error("subscription upsert failed: " + se.message);
  console.log("subscription: premium (plan key: founder) / active");

  // ---- 5. FULL SCAN — mirrors POST /api/scan/full ----
  h("5. FULL SCAN  (site crawl + top 5 prompts × all 5 models)");
  const engines = enabledEngines(PAID_ENGINES);
  console.log("engines:", engines.join(", "));

  const audit = await refreshSiteAudit(admin, brand.id, brand.url);
  console.log("site audit (regex):", audit.checks.map((c) => `${c.id}:${c.status}`).join("  "));

  // AI page-grade (mirrors /api/scan/full step 1b)
  const profile = {
    url: brand.url, company: brand.company, industry: brand.industry, description: brand.description,
    location: brand.location, audience: brand.audience, competitors: brand.competitors,
    differentiators: brand.differentiators, geos: brand.geos, enrichNotes: brand.enrich_notes,
  };
  try {
    const homeRes = await fetch(brand.url.startsWith("http") ? brand.url : `https://${brand.url}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ClerowAudit/1.0)" },
    });
    const html = homeRes.ok ? await homeRes.text() : "";
    const graded = await gradeSite({ brand: profile, html, images: [] });
    console.log("AI page-grade:", graded.map((c) => `${c.id}:${c.status}`).join("  ") || "(none)");
    // Merge into the stored audit (mirrors /api/scan/full) so the ladder below
    // reflects page-specific L2 tasks.
    if (graded.length) {
      const byId = new Map(audit.checks.map((c) => [c.id, c]));
      for (const g of graded) byId.set(g.id, g);
      await admin.from("brands").update({ site_audit: { ...audit, checks: [...byId.values()] } }).eq("id", brand.id);
    }
  } catch (e) {
    console.log("AI page-grade failed:", e instanceof Error ? e.message : e);
  }

  const { data: prompts } = await admin
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brand.id)
    .order("is_primary", { ascending: false })
    .order("volume", { ascending: false })
    .limit(3);

  for (const p of prompts ?? []) {
    const r = await runPromptScan(admin, brand.id, p.id, engines);
    const cells = r.outcomes
      .map((o) => (o.ok ? `${o.label}:${o.position != null ? "#" + o.position : o.visibility > 0 ? o.visibility + "%" : "—"}` : `${o.label}:✗`))
      .join("  ");
    console.log(`• "${p.text}"\n    ${cells}`);
  }

  // ---- 6. snapshot + ladder ----
  h("6. RESULT — snapshot score + ladder");
  const snap = await loadBrandSnapshot(admin, brand.id);
  console.log("score:", JSON.stringify(snap.score));
  console.log("engines scanned:", snap.enginesScanned.join(", "));
  console.log("cited domains:", snap.citedDomains.slice(0, 8).join(", ") || "(none)");

  // Re-fetch the brand so assembleLadderContext sees the merged page-grade audit.
  const { data: freshBrand } = await admin.from("brands").select("*").eq("id", brand.id).single();
  const { ctx } = await assembleLadderContext(admin, freshBrand ?? brand);
  console.log("brand name (stored):", (freshBrand ?? brand).company);
  const { data: tasks } = await admin.from("tasks").select("*").eq("brand_id", brand.id);
  const existing = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? []) if (t.ladder_key) existing.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });
  const ladder = buildLadder(ctx, existing, 0);

  console.log("\nTHE CLIMB:");
  for (const lvl of ladder.levels) {
    console.log(`  L${lvl.level} [${lvl.state}] ${lvl.title}`);
    console.log(`     finding: ${lvl.findings}`);
    for (const t of lvl.tasks) console.log(`     - (${t.channel}) ${t.title}`);
  }
}

main()
  .then(() => { console.log("\n✓ DONE"); process.exit(0); })
  .catch((err) => { console.error("\n✗ FAILED:", err); process.exit(1); });
