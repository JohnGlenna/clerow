// Throwaway E2E check for the new lead sources — run: npx tsx scripts/test-lead-sources.ts
import "./_loadenv";

import { fetchBetaListRaw, fetchTheHub, fetchYCombinatorRaw } from "../lib/leads/sources";

async function main() {
  const hub = await fetchTheHub("NO", 1);
  console.warn(
    "TheHub NO p1:",
    hub.page?.totalPages,
    "pages;",
    hub.candidates.slice(0, 3).map((c) => `${c.name} → ${c.website}`),
  );

  const yc = await fetchYCombinatorRaw();
  console.warn(
    "YC:",
    yc.length,
    "companies;",
    yc.slice(0, 3).map((c) => `${c.name} → ${c.website} [${c.batch}]`),
  );

  const bl = await fetchBetaListRaw();
  console.warn(
    "BetaList:",
    bl.length,
    "startups;",
    bl.slice(0, 3).map((c) => `${c.name} → ${c.website}`),
  );
}

void main();
