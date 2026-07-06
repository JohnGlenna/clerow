// Pure cold-email copy builder. Templates are fixed product copy — edit here,
// not in the UI. Zero-mention prospects get the "new company" angle instead.
//
// Shape (settled after several rounds): ultra-short, every paragraph exactly
// one sentence — people skim cold email; one idea per line.

import type { CompetitorCount, EmailCopy, Lang } from "./types";

const SIGNATURE = "John";

// Full URL (not bare "clerow.com") so mail clients render it as a click-able link.
const CLEROW_URL = "https://clerow.com/";

// Early-user launch offer. Deliberately NOT in the first-touch email — a $3
// offer before they've seen value signals desperation. Kept for follow-ups.
export const DISCOUNT_NO = "PS: Akkurat nå får tidlige brukere Clerow for bare 30 kr den første måneden.";
export const DISCOUNT_EN = "PS: Right now early users get Clerow for just 30 NOK (~$3) for the first month.";

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
};

// The "who wins instead" line; empty array when the scan found no competitors.
function winnersParagraph(i: EmailInput): string[] {
  const names = i.competitors.slice(0, 3).map((c) => c.name);
  if (!names.length) return [];
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} ${i.language === "no" ? "og" : "and"} ${names.at(-1)}`
      : names[0];
  return i.language === "no"
    ? [`Navnene ChatGPT anbefaler i stedet: ${list}.`]
    : [`The names ChatGPT recommends instead: ${list}.`];
}

export function buildEmail(input: EmailInput): EmailCopy {
  if (input.mentionedCount === 0) return zeroMentionEmail(input);
  return standardEmail(input);
}

function standardEmail(i: EmailInput): EmailCopy {
  const top = i.topCompetitor;
  const x = i.mentionedCount;

  if (i.language === "no") {
    const subject = top
      ? `ChatGPT anbefaler ${top} – ikke dere`
      : `ChatGPT nevner ${i.displayName} i bare ${x} av ${i.totalPrompts} svar`;
    const body = [
      "Hei,",
      `Beklager å måtte si det: jeg spurte ChatGPT «${i.samplePrompt}» – ${i.displayName} dukket opp i bare ${x} av ${i.totalPrompts} svar.`,
      ...winnersParagraph(i),
      `Stadig flere spør AI i stedet for Google – det er potensielle kunder som aldri hører om dere.`,
      `Jeg bygde Clerow for å fikse akkurat dette.`,
      `Skann nettsiden deres på ${CLEROW_URL} – to minutter, så ser du hva dere bør fikse først.`,
      SIGNATURE,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = top
    ? `ChatGPT recommends ${top} instead of you`
    : `ChatGPT mentions ${i.displayName} in only ${x} of ${i.totalPrompts} answers`;
  const body = [
    "Hi,",
    `Sorry to be the one to tell you: I asked ChatGPT "${i.samplePrompt}" — ${i.displayName} came up in only ${x} of ${i.totalPrompts} answers.`,
    ...winnersParagraph(i),
    `More and more people ask AI instead of Google — that's potential customers who never hear about you.`,
    `I built Clerow to fix exactly this.`,
    `Scan your site at ${CLEROW_URL} — two minutes and you'll see what to fix first.`,
    SIGNATURE,
  ].join("\n\n");
  return { subject, body };
}

function zeroMentionEmail(i: EmailInput): EmailCopy {
  if (i.language === "no") {
    const subject = `ChatGPT vet ikke at ${i.displayName} finnes ennå`;
    const body = [
      "Hei,",
      `Beklager å måtte si det: jeg spurte ChatGPT «${i.samplePrompt}» – ${i.displayName} dukket ikke opp i det hele tatt.`,
      ...winnersParagraph(i),
      `Stadig flere spør AI i stedet for Google – det er potensielle kunder som aldri hører om dere.`,
      `Jeg bygde Clerow for å fikse akkurat dette.`,
      `Skann nettsiden deres på ${CLEROW_URL} – to minutter, så ser du hva dere bør fikse først.`,
      SIGNATURE,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = `ChatGPT doesn't know ${i.displayName} exists yet`;
  const body = [
    "Hi,",
    `Sorry to be the one to tell you: I asked ChatGPT "${i.samplePrompt}" — ${i.displayName} never came up.`,
    ...winnersParagraph(i),
    `More and more people ask AI instead of Google — that's potential customers who never hear about you.`,
    `I built Clerow to fix exactly this.`,
    `Scan your site at ${CLEROW_URL} — two minutes and you'll see what to fix first.`,
    SIGNATURE,
  ].join("\n\n");
  return { subject, body };
}
