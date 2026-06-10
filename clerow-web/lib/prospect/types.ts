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
  competitors: string[];
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
};

export type EmailCopy = { subject: string; body: string };

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
