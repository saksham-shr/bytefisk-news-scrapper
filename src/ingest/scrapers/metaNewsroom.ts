import * as cheerio from "cheerio";
import type { RawItem } from "../types.js";

const NEWSROOM_URL = "https://about.fb.com/news/";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Meta's newsroom has no official RSS (TECH_NEWS_SOURCE_MAP.md §7). Like
 * Anthropic's site this targets a structural pattern rather than specific
 * CSS classes: every article link is dated, e.g.
 * `https://about.fb.com/news/2026/10/some-headline/`. Version-locked as
 * of 2026-10-26 — throws rather than returning [] if nothing matches, so
 * selector drift is loud, not a silent empty poll.
 */
const ARTICLE_LINK_PATTERN = /\/news\/20\d{2}\/\d{1,2}\/[^/]+\/?$/;

export function parseMetaNewsroomHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !ARTICLE_LINK_PATTERN.test(href)) return;
    const url = new URL(href, NEWSROOM_URL).toString();
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
