// Shared types for the founder-only Prospect Scanner (/admin/prospect-scan).

export type Lang = "no" | "en";

export type ProspectInput = {
  brand: string;
  website: string;
  category: string;
  language: Lang;
  /** Newline-separated prompts; when set, skips the prompt-generation call. */
  promptOverride?: string;
};

/** Per-answer verdict from the extraction call (merged with the deterministic text check). */
export type PerAnswerExtraction = {
  /** 0-based answer index. */
  index: number;
  mentioned: boolean;
  /** True substitutes a buyer could pick instead of the prospect. */
  competitors: string[];
  /** Non-substitute brands the answer named (tools, platforms, directories) — never counted as competitors. */
  otherMentions: string[];
};

export type CompetitorCount = { name: string; mentions: number };

export type ScanAggregate = {
  mentionedCount: number;
  totalPrompts: number;
  competitors: CompetitorCount[];
  topCompetitor: string | null;
  /** Mention count of the top competitor (0 when there is none). */
  topCompetitorMentions: number;
};

export type AnswerRecord = {
  prompt: string;
  answer: string;
  mentioned: boolean;
  competitors: string[];
  /** Tools/platforms named in the answer; optional — scans persisted before this field lack it. */
  otherMentions?: string[];
};

export type EmailCopy = { subject: string; body: string };

/** LLM-generated, grounded in the prospect's real homepage — proof we looked. */
export type SiteTip = {
  /** One short sentence about what the business concretely offers. */
  observation: string;
  /** One specific, actionable GEO improvement for this site. */
  tip: string;
};

/** What we actually read from the prospect's homepage (null tip = generation failed). */
export type SitePeek = {
  url: string;
  title: string | null;
  description: string | null;
  /** Visible homepage text, truncated. */
  text: string;
  tip: SiteTip | null;
};

export type ProspectScanResult = {
  brand: string;
  website: string;
  websiteKey: string;
  category: string;
  language: Lang;
  mentionedCount: number;
  totalPrompts: number;
  competitors: CompetitorCount[];
  topCompetitor: string | null;
  answers: AnswerRecord[];
  email: EmailCopy;
  /** Homepage peek + generated tip; null when the site couldn't be read. */
  sitePeek: SitePeek | null;
};

/** One row of the brreg lead-script CSV (navn,orgnr,website,email,phone,sted,niche,registrert). */
export type ProspectCsvRow = {
  navn: string;
  orgnr: string;
  website: string;
  email: string;
  phone: string;
  sted: string;
  niche: string;
  registrert: string;
};
