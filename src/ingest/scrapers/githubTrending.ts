import * as cheerio from "cheerio";
import type { RawItem } from "../types.js";

const TRENDING_URL = "https://github.com/trending?since=daily";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Version-locked against github.com/trending's markup as researched
 * 2026-10-26 (TECH_NEWS_SOURCE_MAP.md §4): each trending repo is an
 * `article.Box-row` with its `owner/repo` link in `h2 a[href]` and an
 * optional description in the first `p`. GitHub has no official endpoint
 * for this page — if this selector stops matching anything, that's page
 * drift, not an empty trending list, so we throw instead of returning [].
 */
export function parseGithubTrendingHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];

  $("article.Box-row").each((_, el) => {
    const href = $(el).find("h2 a").attr("href");
    if (!href) return;
    const repoPath = href.trim().replace(/^\//, "");
    const url = `https://github.com/${repoPath}`;
    const description = $(el).find("p").first().text().trim();

    items.push({
      sourceId,
      url,
      guid: url,
      title: repoPath,
      summary: description,
      publishedAt: null,
    });
  });

  if (items.length === 0) {
    throw new Error(
      `${sourceId}: parsed 0 repos from github.com/trending — selectors likely drifted (expected article.Box-row > h2 a), update parseGithubTrendingHtml`,
    );
  }
  return items;
}

export async function fetchGithubTrending(sourceId: string): Promise<RawItem[]> {
  const res = await fetch(TRENDING_URL, {
    headers: { "User-Agent": "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${TRENDING_URL} -> HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseGithubTrendingHtml(html, sourceId);
}
