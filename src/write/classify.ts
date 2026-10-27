import { sources } from "../config/sources.js";
import type { NewsCategory } from "./types.js";

/**
 * Explicit, reviewable category mapping — keyed by `Source.mapSection`
 * (TECH_NEWS_SOURCE_MAP.md section number(s), exactly as stored in
 * src/config/sources.ts) rather than guessed per-item from free text.
 * Every section a `news`-collection source can carry is listed here so
 * the mapping is a flat table anyone can read top to bottom, not an
 * inferred/implicit default.
 *
 *   §1  India tech, startups, and funding        -> Funding
 *   §2  Global major technology news              -> Industry
 *   §3  Funding-specific structured data           -> Funding   (not built — issue #6/step 7, kept for when it is)
 *   §4  GitHub Trending                            -> Open Source
 *   §6  AI coding agents / HN Algolia              -> Industry  (ecosystem discussion, not an official announcement)
 *   §6,7 OpenAI/Anthropic (dual-tagged official news) -> Launches
 *   §7  Official company news (all other vendors)  -> Launches
 *   §8  Research papers (arXiv, Semantic Scholar)  -> Industry
 *   §10 Policy and regulation                      -> Policy
 *   §12 Open-source release tracking                -> Open Source
 *
 * §11 (events) never reaches this map — those sources are collection
 * "events", not "news" (see pipeline.ts), and use EventFrontmatter's
 * `type` field instead of NewsCategory.
 */
const CATEGORY_BY_MAP_SECTION: Record<string, NewsCategory> = {
  "1": "Funding",
  "2": "Industry",
  "3": "Funding",
  "4": "Open Source",
  "6": "Industry",
  "6,7": "Launches",
  "7": "Launches",
  "8": "Industry",
  "10": "Policy",
  "12": "Open Source",
};

const DEFAULT_CATEGORY: NewsCategory = "Industry";

/**
 * Looks up a news item's category from its source's mapSection via the
 * table above — deterministic per source, not inferred per-item from
 * the item's own title/summary text.
 */
export function classifyCategory(sourceId: string): NewsCategory {
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return DEFAULT_CATEGORY;
  return CATEGORY_BY_MAP_SECTION[source.mapSection] ?? DEFAULT_CATEGORY;
}
