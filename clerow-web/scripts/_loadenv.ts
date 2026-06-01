// Load .env.local into process.env BEFORE any lib module is imported, so the
// engine adapters (which read their API keys at module-eval time) see the keys.
// Imported first in the test script. Run scripts from the clerow-web dir.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), ".env.local");
const text = readFileSync(path, "utf8");
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue; // skips blanks and # comments
  let val = m[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!(m[1] in process.env)) process.env[m[1]] = val;
}
