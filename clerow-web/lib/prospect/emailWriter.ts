// LLM-written outreach email: one call turns the full scan context (crawled
// homepage, per-question results, competitor leaderboard) into a personalized
// subject + body. Never throws — any failure returns null and the caller falls
// back to the fixed template in email.ts, so the pipeline can't lose a scan to
// a flaky writer call.

import { chatCompletion } from "./openai";
import type { CompetitorCount, EmailCopy, Lang } from "./types";

const EXCERPT_CHARS = 500;
const TOP_COMPETITORS = 5;

export type EmailWriterInput = {
  /** What the email calls the prospect — the bare domain, never the registry org name. */
  displayName: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  /** Filtered competitor leaderboard (true substitutes only). */
  competitors: CompetitorCount[];
  answers: { prompt: string; text: string; mentioned: boolean; competitors: string[] }[];
  /** Crawled homepage; null when the site couldn't be read. */
  site: { url: string; title: string | null; description: string | null; text: string } | null;
};

const EMAIL_SCHEMA = {
  name: "outreach_email",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["subject", "body"],
    properties: {
      subject: { type: "string" },
      body: { type: "string" },
    },
  },
} as const;

const WRITER_SYSTEM =
  "You write a cold outreach email from John, the founder of Clerow, to a small-business owner. " +
  "You are given REAL data: the content of the prospect's homepage, and the results of a scan where " +
  "ChatGPT was asked real buyer questions in the prospect's market.\n\n" +
  "VOICE: A short personal note typed to one person, not a report or a campaign. Plain, direct, " +
  "founder-to-founder; contractions are good. No flattery, no 'I hope this finds you well', no hype " +
  "words, no exclamation marks, no emoji. Write like a busy person who did real homework on this " +
  "specific company and is telling them something they'd want to know.\n\n" +
  "LANGUAGE: Write the entire email (subject and body) in the language given in the data " +
  "('no' = Norwegian bokmål, 'en' = English).\n\n" +
  "GROUNDING — the email must prove we actually looked:\n" +
  "- Refer to the prospect ONLY by their domain or by what their own website calls them. NEVER use a " +
  "registry or legal company name.\n" +
  "- Use only names and numbers from the data. If the prospect appeared in 0 answers, the angle is: " +
  "buyers who ask AI for recommendations never hear about them, while the named competitors own " +
  "those answers today. If the data contains no competitors, skip naming any — never invent one.\n" +
  "- Numbers appear in prose, never as a data dump: name the top 2-3 competitors naturally in a " +
  "sentence, and spell out at most ONE count where it stings (e.g. 'Superhuman AI showed up in 4 of " +
  "the 6 answers'). Never write a list like 'Superhuman AI (4), Flowrite (2), MailMaestro (2)' — " +
  "that reads like a report, not a person.\n" +
  "- If the raw counts aren't dramatic (say 1 of 6 while the leader has 2 of 6), don't lean on " +
  "them — a skeptical reader does the math and shrugs. Frame the pattern instead: several " +
  "competitors get named ahead of them when buyers ask.\n\n" +
  "STRUCTURE — problem first, solution right after, nothing in between:\n" +
  "1. PROBLEM (first paragraph after the greeting): a short first-person story — you were checking " +
  "how AI answers buyer questions in their market, you asked ChatGPT one of them (quote the actual " +
  "question), and the blunt result: they never came up / came up in only X of N answers, while the " +
  "competitors did. Close the same paragraph with what that costs them: more and more buyers ask AI " +
  "instead of Googling, and those buyers never hear about them. Vary the wording; don't reuse the " +
  "same sentence every time.\n" +
  "2. PROOF (one short sentence, own paragraph): a concrete detail from the homepage (what they " +
  "offer, who they serve — strictly from the content provided) showing the miss is undeserved: they " +
  "clearly have exactly what those buyers are asking for; AI just doesn't know it yet. Never invent " +
  "services, claims, or pages you cannot see.\n" +
  "3. SOLUTION + CTA: John built Clerow to fix exactly this. Tell them to scan their website now " +
  "at https://clerow.com/ — in a couple of minutes they'll see exactly where they're missing and " +
  "what to fix first. Do NOT recite features or list AI model names here — someone who doesn't " +
  "know Clerow yet doesn't care. Include the link https://clerow.com/ exactly once, written as the " +
  "full URL including https:// so mail clients auto-link it.\n\n" +
  "FORMAT:\n" +
  "- subject: max 55 characters, concrete and curiosity-driven — it must earn the open by creating " +
  "tension, NOT just restate a statistic. Never use the flat '<name> in X of N answers' / '<name> in " +
  "X of N AI answers' pattern; that reads like a report, not a reason to open. Pick the angle from the " +
  "real data:\n" +
  "    - A competitor clearly leads the scan: name them as the one AI recommends instead — e.g. " +
  '"ChatGPT recommends <competitor>, not you" / "ChatGPT anbefaler <competitor>, ikke <domain>".\n' +
  "    - The prospect appeared in 0 answers: use the 'AI doesn't know you exist yet' angle — e.g. " +
  '"ChatGPT doesn\'t know <domain> exists yet" / "ChatGPT vet ikke at <domain> finnes ennå".\n' +
  "    - Otherwise: lead with what they're missing — buyers asking AI in their market don't hear " +
  "about them — in your own words.\n" +
  "  Use only real names from the data, in the target language, sentence case (not Title Case, no " +
  "ALL CAPS), no clickbait, no emoji.\n" +
  "- body: plain text only — no markdown, no bullet points, no placeholders like [name]. Exactly " +
  "the 3 paragraphs above separated by blank lines, 55-110 words total. Start with a plain " +
  "greeting ('Hei,' / 'Hi,').\n" +
  "- Sign off with just 'John' as its own paragraph. No PS, no discount, no footer.\n\n" +
  "HONESTY: Every number and name must come from the data provided. Never exaggerate or invent " +
  "statistics, competitors, or site details.";

function buildUserMessage(i: EmailWriterInput): string {
  const parts = [
    `Language: ${i.language}`,
    `Prospect domain: ${i.displayName}`,
  ];

  if (i.site) {
    parts.push(
      "HOMEPAGE (real, crawled):\n" +
        `URL: ${i.site.url}\n` +
        `Title: ${i.site.title ?? "(none)"}\n` +
        `Meta description: ${i.site.description ?? "(none)"}\n` +
        `Visible text:\n${i.site.text}`,
    );
  }

  const leaderboard = i.competitors
    .slice(0, TOP_COMPETITORS)
    .map((c) => `${c.name} (${c.mentions})`)
    .join(", ");
  parts.push(
    `SCAN RESULT: asked ChatGPT ${i.totalPrompts} buyer questions; prospect appeared in ` +
      `${i.mentionedCount} of ${i.totalPrompts} answers.\n` +
      `Competitor leaderboard (appearances out of ${i.totalPrompts}): ${leaderboard || "(none found)"}`,
  );

  parts.push(
    "PER-QUESTION DETAIL:\n" +
      i.answers
        .map(
          (a, idx) =>
            `${idx + 1}. Q: "${a.prompt}" | prospect mentioned: ${a.mentioned ? "yes" : "no"} | ` +
            `competitors named: ${a.competitors.join(", ") || "(none)"}\n` +
            `   Answer excerpt: ${a.text.slice(0, EXCERPT_CHARS)}`,
        )
        .join("\n"),
  );

  return parts.join("\n\n");
}

/**
 * Validate and clean the writer's raw JSON reply. Null (→ template fallback)
 * when the JSON is invalid, a field is empty, or the body lost the Clerow link
 * — the template guarantees the link, so a non-compliant draft is rejected
 * rather than patched.
 */
export function parseEmailReply(raw: string): EmailCopy | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as { subject?: unknown; body?: unknown };
  const subject = typeof o.subject === "string" ? o.subject.trim() : "";
  const body =
    typeof o.body === "string" ? o.body.trim().replace(/\n{3,}/g, "\n\n") : "";
  if (!subject || !body) return null;
  if (!body.includes("https://clerow.com/")) return null;
  return { subject, body };
}

/** One writer call → personalized {subject, body}. Null on any failure. */
export async function writeEmail(
  input: EmailWriterInput,
  signal?: AbortSignal,
): Promise<EmailCopy | null> {
  try {
    const reply = await chatCompletion({
      system: WRITER_SYSTEM,
      user: buildUserMessage(input),
      jsonSchema: EMAIL_SCHEMA,
      maxTokens: 3000,
      signal,
    });
    return parseEmailReply(reply);
  } catch {
    return null;
  }
}
