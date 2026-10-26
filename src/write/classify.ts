import type { NewsCategory } from "./types.js";

/**
 * Keyword heuristic for the mandatory `category` field — this is a
 * deterministic classifier, not NLP. Order matters: funding/policy
 * signals are checked before the broader "launch" wording, and anything
 * unmatched falls back to "Industry" (the catch-all CLAUDE.md bucket).
 */
const FUNDING_KEYWORDS = /\b(raises?|raised|funding round|seed round|series [a-e]\b|valuation|venture capital|\bvc\b|investors?|invests?)\b/i;
const POLICY_KEYWORDS = /\b(regulation|regulators?|policy|bill|lawsuit|antitrust|compliance|gdpr|court|ruling|ban(?:ned|s)?|sanctions?)\b/i;
const LAUNCH_KEYWORDS = /\b(launches?|launched|unveils?|announces?|announced|introduces?|introduced|releases?|released|debuts?)\b/i;

/** Sources whose entire output is open-source signal, regardless of wording. */
const OPEN_SOURCE_SOURCE_IDS = new Set(["github-trending", "github-releases-watchlist"]);

export function classifyCategory(sourceId: string, title: string, summary: string): NewsCategory {
  if (OPEN_SOURCE_SOURCE_IDS.has(sourceId)) return "Open Source";

  const text = `${title} ${summary}`;
  if (FUNDING_KEYWORDS.test(text)) return "Funding";
  if (POLICY_KEYWORDS.test(text)) return "Policy";
  if (LAUNCH_KEYWORDS.test(text)) return "Launches";
  return "Industry";
}
