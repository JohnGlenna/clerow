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
      `Jeg sjekket hvordan AI svarer kjøpere i markedet deres og spurte ChatGPT «${i.samplePrompt}» (pluss ${others} lignende spørsmål) – ${i.displayName} dukket opp i bare ${x} av ${i.totalPrompts} svar.` +
        (top ? ` ${top} ble anbefalt i ${y} av dem.` : ""),
      `Stadig flere kjøpere spør AI i stedet for å google, og de hører aldri om dere – dere går glipp av potensielle kunder hver uke.`,
      ...siteTipParagraph(i),
      `Jeg bygde Clerow for akkurat dette: den sjekker synligheten deres i ChatGPT, Claude, Perplexity, Gemini og Grok, og gir dere én konkret ting å fikse hver dag. Skann nettsiden deres nå på ${CLEROW_URL} – på et par minutter ser du nøyaktig hvor ${i.displayName} mangler og hva dere bør fikse først.`,
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
    `I was checking how AI answers buyers in your market and asked ChatGPT "${i.samplePrompt}" (plus ${others} similar questions) — ${i.displayName} came up in only ${x} of ${i.totalPrompts} answers.` +
      (top ? ` ${top} was recommended in ${y} of them.` : ""),
    `More and more buyers ask AI instead of Google, and those buyers never hear about you — that's potential customers you're losing every week.`,
    ...siteTipParagraph(i),
    `I built Clerow for exactly this: it checks your visibility across ChatGPT, Claude, Perplexity, Gemini and Grok, and gives you one concrete thing to fix each day. Scan your website now at ${CLEROW_URL} — in a couple of minutes you'll see exactly where ${i.displayName} is missing and what to fix first.`,
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
      `Jeg sjekket hvordan AI svarer kjøpere i markedet deres og spurte ChatGPT «${i.samplePrompt}» (pluss ${others} lignende spørsmål) – ${i.displayName} dukket ikke opp i et eneste svar.` +
        (owners.length
          ? ` Navnene som gikk igjen var ${ownerList}.`
          : ""),
      `Stadig flere kjøpere spør AI i stedet for å google, og de hører aldri om dere – dere går glipp av potensielle kunder hver uke.`,
      ...siteTipParagraph(i),
      `Den gode nyheten: dette er fiksbart på noen uker, ikke år. Jeg bygde Clerow for akkurat dette: den sjekker synligheten deres i ChatGPT, Claude, Perplexity, Gemini og Grok, og gir dere én konkret ting å fikse hver dag. Skann nettsiden deres nå på ${CLEROW_URL} – på et par minutter ser du nøyaktig hvor ${i.displayName} mangler og hva dere bør fikse først.`,
      SIGNATURE,
      DISCOUNT_NO,
    ].join("\n\n");
    return { subject, body };
  }

  const subject = `ChatGPT doesn't know ${i.displayName} exists yet`;
  const body = [
    "Hi,",
    `I was checking how AI answers buyers in your market and asked ChatGPT "${i.samplePrompt}" (plus ${others} similar questions) — ${i.displayName} didn't come up in a single answer.` +
      (owners.length ? ` The names that kept coming up were ${ownerList}.` : ""),
    `More and more buyers ask AI instead of Google, and those buyers never hear about you — that's potential customers you're losing every week.`,
    ...siteTipParagraph(i),
    `The good news: this is fixable in weeks, not years. I built Clerow for exactly this: it checks your visibility across ChatGPT, Claude, Perplexity, Gemini and Grok, and gives you one concrete thing to fix each day. Scan your website now at ${CLEROW_URL} — in a couple of minutes you'll see exactly where ${i.displayName} is missing and what to fix first.`,
    SIGNATURE,
    DISCOUNT_EN,
  ].join("\n\n");
  return { subject, body };
}
