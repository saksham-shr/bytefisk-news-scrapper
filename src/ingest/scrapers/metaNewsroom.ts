import * as cheerio from "cheerio";
import type { RawItem } from "../types.js";

const NEWSROOM_URL = "https://about.fb.com/news/";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Version-locked selectors/patterns against about.fb.com/news's markup.
 * Checked: 2026-10-26 (TECH_NEWS_SOURCE_MAP.md §7). Meta's newsroom has
 * no official RSS, so this targets a structural pattern rather than
 * specific CSS classes: every article link is dated, e.g.
 * `https://about.fb.com/news/2026/10/some-headline/`. Throws rather
 * than returning [] if nothing matches, so selector/pattern drift is
 * loud, not a silent empty poll.
 */
const SELECTORS = {
  /** Every link on the page is checked against articlePathPattern below. */
  anyLink: "a[href]",
  /**
   * Anchored at both ends and matched against the resolved URL's
   * *pathname* (not the raw href) so a tracking/redirect link whose
   * query string merely ends in something shaped like this can't
   * sneak through, and relative vs. absolute hrefs are treated
   * identically.
   */
  articlePathPattern: /^\/news\/20\d{2}\/\d{1,2}\/[^/]+\/?$/,
} as const;

export function parseMetaNewsroomHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $(SELECTORS.anyLink).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let resolved: URL;
    try {
      resolved = new URL(href, NEWSROOM_URL);
    } catch {
      return;
    }
    if (!SELECTORS.articlePathPattern.test(resolved.pathname)) return;

    const url = resolved.toString();
    if (seen.has(url)) return;

    const title = $(el).text().trim();
    if (!title) return;
    seen.add(url);
    items.push({ sourceId, url, guid: url, title, summary: "", publishedAt: null });
  });

  if (items.length === 0) {
    throw new Error(
      `${sourceId}: parsed 0 items from about.fb.com/news — link pattern likely drifted (expected /news/YYYY/M/slug/), update parseMetaNewsroomHtml`,
    );
  }
  return items;
}

export async function fetchMetaNewsroom(sourceId: string): Promise<RawItem[]> {
  const res = await fetch(NEWSROOM_URL, {
    headers: { "User-Agent": "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${NEWSROOM_URL} -> HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseMetaNewsroomHtml(html, sourceId);
}
