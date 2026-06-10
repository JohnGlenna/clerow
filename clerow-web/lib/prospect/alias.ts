// Pure brand-name matching helpers. Unicode-aware so Norwegian names (æøå)
// survive — never strip to [a-z0-9].

const LEGAL_SUFFIX = /\s+(as|asa|ans|da|enk|sa|ltd|llc|inc|gmbh|ab|aps|oy|bv|plc|co)\.?$/i;

/** Dedupe/comparison key for a brand name: lowercase, legal suffix dropped, punctuation collapsed. */
export function normBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIX, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * All the strings that count as "the prospect" in an answer: the brand name,
 * the name without its legal suffix (Fjellsport AS → Fjellsport), a
 * space/hyphen-collapsed variant, the website's bare host (fjellsport.no) and
 * the host without TLD.
 */
export function buildAliasSet(brand: string, website: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const t = s.toLowerCase().trim();
    if (t.length >= 3) out.add(t);
  };

  const name = brand.trim();
  if (name) {
    add(name);
    const bare = name.replace(LEGAL_SUFFIX, "").trim();
    add(bare);
    add(bare.replace(/[\s-]+/g, ""));
  }

  const host = normalizeWebsite(website);
  if (host) {
    add(host);
    const label = host.split(".")[0];
    add(label);
  }

  return [...out];
}

/** Case-insensitive whole-word match of any alias in the text (Unicode word boundaries). */
export function textMentionsBrand(text: string, aliases: string[]): boolean {
  if (!text) return false;
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(text)) return true;
  }
  return false;
}

/** Bare lowercase host: strips scheme, www., path/query/fragment, port, trailing dot. */
export function normalizeWebsite(url: string): string {
  return (url || "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}
