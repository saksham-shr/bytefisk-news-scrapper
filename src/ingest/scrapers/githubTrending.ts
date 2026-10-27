import * as cheerio from "cheerio";
import type { RawItem } from "../types.js";

const TRENDING_URL = "https://github.com/trending?since=daily";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Version-locked selectors against github.com/trending's markup.
 * Checked: 2026-10-26 (TECH_NEWS_SOURCE_MAP.md §4). GitHub has no
 * official endpoint for this page, so these are the only thing standing
 * between this source and a silent outage — if parseGithubTrendingHtml
 * starts throwing "0 repos parsed", the page's structure changed and
 * these need updating, not the other way around.
 */
const SELECTORS = {
  /** Each trending repo is one of these. */
  repoRow: "article.Box-row",
  /** The owner/repo link, relative to a repoRow element. */
  repoLink: "h2 a",
  /** The repo's one-line description, relative to a repoRow element. */
  description: "p",
} as const;

export function parseGithubTrendingHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];

  $(SELECTORS.repoRow).each((_, el) => {
    const href = $(el).find(SELECTORS.repoLink).attr("href");
    if (!href) return;
    const repoPath = href.trim().replace(/^\//, "");
    const url = `https://github.com/${repoPath}`;
    const description = $(el).find(SELECTORS.description).first().text().trim();

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
      `${sourceId}: parsed 0 repos from github.com/trending — selectors likely drifted (expected ${SELECTORS.repoRow} > ${SELECTORS.repoLink}), update the SELECTORS block in parseGithubTrendingHtml`,
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
