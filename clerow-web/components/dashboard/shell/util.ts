// "https://www.example.com/x" → "example.com". Used by the top bar greeting and
// the right rail's placement logos so they match the connected site.
export function domainOf(url?: string) {
  if (!url) return "your site";
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}
