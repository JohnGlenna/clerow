// "https://www.example.com/x" → "example.com". Used by the top bar greeting and
// the right rail's placement logos so they match the connected site.
export function domainOf(url?: string) {
  if (!url) return "your site";
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

// Best-effort domain for a brand's logo/label. The scan resolves a real domain
// per brand (detect.ts); prefer it. Fall back to the user's own connected URL,
// then to a `<name>.com` guess for older scans that have no stored domain.
// Shared by the right-rail placement card and the category leaderboard.
export function logoDomain(name: string, isYou: boolean, scanned: string | null, ownUrl?: string): string | null {
  if (scanned) return scanned;
  if (isYou) return ownUrl ? domainOf(ownUrl) : null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}
