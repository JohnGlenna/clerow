// Pure cold-email copy builder. Templates are fixed product copy — edit here,
// not in the UI. Zero-mention prospects get the "new company" angle instead.

import type { CompetitorCount, EmailCopy, Lang, SiteTip } from "./types";

const SIGNATURE = "John";

// Full URL (not bare "clerow.com") so mail clients render it as a click-able link.
const CLEROW_URL = "https://clerow.com/";

// Early-user launch offer, mentioned in every outreach mail.
const DISCOUNT_NO = "PS: Akkurat nå får tidlige brukere Clerow for bare 30 kr den første måneden.";
const DISCOUNT_EN = "PS: Right now early users get Clerow for just 30 NOK (~$3) for the first month.";

export type EmailInput = {
  /** What the email calls the prospect — the bare domain (e.g. "nord-flow.no"), never the ugly registry org name. */
  displayName: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  topCompetitor: string | null;
  topCompetitorMentions: number;
  competitors: CompetitorCount[];
  /** The example prompt quoted in the email (the first buyer prompt). */
  samplePrompt: string;
  /** Homepage-grounded observation + tip; omitted from the email when null. */
  siteTip?: SiteTip | null;
};

// One sentence with exactly one terminal period, however the LLM punctuated it.
function sentence(s: string): string {
  return `${s.trim().replace(/[.\s]+$/, "")}.`;
}

// The "we actually read your site" paragraph; empty array when there is no tip
// so the email gracefully falls back to the non-grounded copy.
function siteTipParagraph(i: EmailInput): string[] {
  if (!i.siteTip) return [];
  const observation = sentence(i.siteTip.observation);
  const tip = sentence(i.siteTip.tip);
  return i.language === "no"
    ? [`Jeg tok en titt på ${i.displayName} – ${observation} ${tip}`]
    : [`I took a look at ${i.displayName} — ${observation} ${tip}`];
}

export function buildEmail(input: EmailInput): EmailCopy {
  if (input.mentionedCount === 0) return zeroMentionEmail(input);
  return standardEmail(input);
}

function standardEmail(i: EmailInput): EmailCopy {
  const others = i.totalPrompts - 1;
  const top = i.topCompetitor;
  const x = i.mentionedCount;
  const y = i.topCompetitorMentions;

  if (i.language === "no") {
    const subject = top
      ? `ChatGPT anbefaler ${top} – ikke dere`
      : `ChatGPT nevner ${i.displayName} i bare ${x} av ${i.totalPrompts} svar`;
    const body = [
      "Hei,",
      `Jeg spurte ChatGPT «${i.samplePrompt}» og ${others} lignende kjøperspørsmål – ${i.displayName} dukket opp i ${x} av ${i.totalPrompts} svar.` +
        (top ? ` ${top} var med i ${y}.` : ""),
      ...siteTipParagraph(i),
      `Stadig flere kunder spør AI om anbefalinger i stedet for å google. Jeg har bygget Clerow (${CLEROW_URL}) – det sporer synligheten deres på tvers av 5 AI-modeller og gir konkrete oppgaver for å tette gapet.`,
      `Vil du se hele skanningen for ${i.displayName}? Helt gratis og uforpliktende.`,
      SIGNATURE,
      DISCOUNT_NO,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = top
    ? `ChatGPT recommends ${top} instead of you`
    : `ChatGPT mentions ${i.displayName} in only ${x} of ${i.totalPrompts} answers`;
  const body = [
    "Hi,",
    `I asked ChatGPT "${i.samplePrompt}" and ${others} similar buyer questions — ${i.displayName} showed up in ${x} of ${i.totalPrompts} answers.` +
      (top ? ` ${top} showed up in ${y}.` : ""),
    ...siteTipParagraph(i),
    `More and more buyers ask AI for recommendations instead of Googling. I built Clerow (${CLEROW_URL}) — it tracks your visibility across 5 AI models and gives you concrete daily tasks to close the gap.`,
    `Want the full scan for ${i.displayName}? Free, no strings.`,
    SIGNATURE,
    DISCOUNT_EN,
  ].join("\n\n");
  return { subject, body };
}

function zeroMentionEmail(i: EmailInput): EmailCopy {
  const others = i.totalPrompts - 1;
  const owners = i.competitors.slice(0, 3).map((c) => c.name);
  const ownerList = owners.join(", ");

  if (i.language === "no") {
    const subject = `ChatGPT vet ikke at ${i.displayName} finnes ennå`;
    const body = [
      "Hei,",
      `Jeg spurte ChatGPT «${i.samplePrompt}» og ${others} lignende kjøperspørsmål – ${i.displayName} dukket ikke opp i et eneste svar. Det er helt normalt for nyere selskaper, men det betyr at kunder som spør AI om anbefalinger aldri hører om dere.`,
      ...siteTipParagraph(i),
      owners.length
        ? `Akkurat nå er det ${ownerList} som eier svarene i kategorien deres.`
        : "Akkurat nå er det andre aktører som eier svarene i kategorien deres.",
      `Den gode nyheten: dette er fiksbart på noen uker, ikke år. Jeg har bygget Clerow (${CLEROW_URL}) – det sporer synligheten deres på tvers av 5 AI-modeller og gir konkrete daglige oppgaver for å komme inn i svarene.`,
      `Vil du se hele skanningen for ${i.displayName}? Helt gratis og uforpliktende.`,
      SIGNATURE,
      DISCOUNT_NO,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = `ChatGPT doesn't know ${i.displayName} exists yet`;
  const body = [
    "Hi,",
    `I asked ChatGPT "${i.samplePrompt}" and ${others} similar buyer questions — ${i.displayName} didn't show up in a single answer. That's completely normal for newer companies, but it means buyers who ask AI for recommendations never hear about you.`,
    ...siteTipParagraph(i),
    owners.length
      ? `Right now ${ownerList} own the answers in your category.`
      : "Right now other players own the answers in your category.",
    `The good news: this is fixable in weeks, not years. I built Clerow (${CLEROW_URL}) — it tracks your visibility across 5 AI models and gives you concrete daily tasks to get into the answers.`,
    `Want the full scan for ${i.displayName}? Free, no strings.`,
    SIGNATURE,
    DISCOUNT_EN,
  ].join("\n\n");
  return { subject, body };
}
