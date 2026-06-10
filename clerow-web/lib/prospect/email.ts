// Pure cold-email copy builder. Templates are fixed product copy — edit here,
// not in the UI. Zero-mention prospects get the "new company" angle instead.

import type { CompetitorCount, EmailCopy, Lang } from "./types";

const SIGNATURE = "John";

export type EmailInput = {
  brand: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  topCompetitor: string | null;
  topCompetitorMentions: number;
  competitors: CompetitorCount[];
  /** The example prompt quoted in the email (the first buyer prompt). */
  samplePrompt: string;
};

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
      : `ChatGPT nevner ${i.brand} i bare ${x} av ${i.totalPrompts} svar`;
    const body = [
      "Hei,",
      `Jeg spurte ChatGPT «${i.samplePrompt}» og ${others} lignende kjøperspørsmål – ${i.brand} dukket opp i ${x} av ${i.totalPrompts} svar.` +
        (top ? ` ${top} var med i ${y}.` : ""),
      "Stadig flere kunder spør AI om anbefalinger i stedet for å google. Jeg har bygget Clerow (clerow.com) – det sporer synligheten deres på tvers av 5 AI-modeller og gir konkrete oppgaver for å tette gapet.",
      `Vil du se hele skanningen for ${i.brand}? Helt gratis og uforpliktende.`,
      SIGNATURE,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = top
    ? `ChatGPT recommends ${top} instead of you`
    : `ChatGPT mentions ${i.brand} in only ${x} of ${i.totalPrompts} answers`;
  const body = [
    "Hi,",
    `I asked ChatGPT "${i.samplePrompt}" and ${others} similar buyer questions — ${i.brand} showed up in ${x} of ${i.totalPrompts} answers.` +
      (top ? ` ${top} showed up in ${y}.` : ""),
    "More and more buyers ask AI for recommendations instead of Googling. I built Clerow (clerow.com) — it tracks your visibility across 5 AI models and gives you concrete daily tasks to close the gap.",
    `Want the full scan for ${i.brand}? Free, no strings.`,
    SIGNATURE,
  ].join("\n\n");
  return { subject, body };
}

function zeroMentionEmail(i: EmailInput): EmailCopy {
  const others = i.totalPrompts - 1;
  const owners = i.competitors.slice(0, 3).map((c) => c.name);
  const ownerList = owners.join(", ");

  if (i.language === "no") {
    const subject = `ChatGPT vet ikke at ${i.brand} finnes ennå`;
    const body = [
      "Hei,",
      `Jeg spurte ChatGPT «${i.samplePrompt}» og ${others} lignende kjøperspørsmål – ${i.brand} dukket ikke opp i et eneste svar. Det er helt normalt for nyere selskaper, men det betyr at kunder som spør AI om anbefalinger aldri hører om dere.`,
      owners.length
        ? `Akkurat nå er det ${ownerList} som eier svarene i kategorien deres.`
        : "Akkurat nå er det andre aktører som eier svarene i kategorien deres.",
      "Den gode nyheten: dette er fiksbart på noen uker, ikke år. Jeg har bygget Clerow (clerow.com) – det sporer synligheten deres på tvers av 5 AI-modeller og gir konkrete daglige oppgaver for å komme inn i svarene.",
      `Vil du se hele skanningen for ${i.brand}? Helt gratis og uforpliktende.`,
      SIGNATURE,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = `ChatGPT doesn't know ${i.brand} exists yet`;
  const body = [
    "Hi,",
    `I asked ChatGPT "${i.samplePrompt}" and ${others} similar buyer questions — ${i.brand} didn't show up in a single answer. That's completely normal for newer companies, but it means buyers who ask AI for recommendations never hear about you.`,
    owners.length
      ? `Right now ${ownerList} own the answers in your category.`
      : "Right now other players own the answers in your category.",
    "The good news: this is fixable in weeks, not years. I built Clerow (clerow.com) — it tracks your visibility across 5 AI models and gives you concrete daily tasks to get into the answers.",
    `Want the full scan for ${i.brand}? Free, no strings.`,
    SIGNATURE,
  ].join("\n\n");
  return { subject, body };
}
