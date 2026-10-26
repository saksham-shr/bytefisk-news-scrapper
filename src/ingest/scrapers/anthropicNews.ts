import * as cheerio from "cheerio";
import type { RawItem } from "../types.js";

const NEWS_URL = "https://www.anthropic.com/news";
const RELEASE_NOTES_URL = "https://docs.anthropic.com/en/release-notes/overview";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * anthropic.com has no official RSS (TECH_NEWS_SOURCE_MAP.md §6/§7).
 * Its news index is a JS-rendered marketing site whose CSS class names are
 * expected to be hashed/unstable, so instead of locking to specific
 * classes this targets the one structural fact unlikely to change: each
 * news item links to a path under `/news/`. Version-locked as of
 * 2026-10-26 — if this stops matching, the page's link structure changed
 * and parseAnthropicNewsHtml needs updating (it throws rather than
 * returning an empty list, per CLAUDE.md's "fail loud" instruction).
 */
export function parseAnthropicNewsHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $('a[href^="/news/"], a[href^="https://www.anthropic.com/news/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const url = new URL(href, NEWS_URL).toString();
    if (url === NEWS_URL || url === `${NEWS_URL}/` || seen.has(url)) return;

    const title = $(el).text().trim();
    if (!title) return;
    seen.add(url);
    items.push({ sourceId, url, guid: url, title, summary: "", publishedAt: null });
  });

  if (items.length === 0) {
    throw new Error(
      `${sourceId}: parsed 0 items from anthropic.com/news — link structure likely drifted (expected a[href^="/news/"]), update parseAnthropicNewsHtml`,
    );
  }
  return items;
}

/**
 * The release-notes page is a single long doc with one heading per
 * release rather than per-release links, so each `h2`/`h3` in the main
 * content becomes its own item, linked back to the page plus the
 * heading's `id` as an anchor when one is present.
 */
export function parseAnthropicReleaseNotesHtml(html: string, sourceId: string): RawItem[] {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];

  $("h2, h3").each((_, el) => {
    const title = $(el).text().trim();
    if (!title) return;
    const id = $(el).attr("id");
    const url = id ? `${RELEASE_NOTES_URL}#${id}` : RELEASE_NOTES_URL;
    const summary = $(el).nextUntil("h2, h3", "p").first().text().trim();
    items.push({ sourceId, url, guid: url, title, summary, publishedAt: null });
  });

  if (items.length === 0) {
    throw new Error(
      `${sourceId}: parsed 0 headings from Anthropic release notes — page structure likely drifted, update parseAnthropicReleaseNotesHtml`,
    );
  }
  return items;
}

async function fetchHtml(url: string, sourceId: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  return res.text();
}

/**
 * Fetch both anthropic.com/news and the release-notes overview and merge.
 * One failing doesn't drop the other — only a total failure is thrown.
 */
export async function fetchAnthropicNews(sourceId: string): Promise<RawItem[]> {
  const settled = await Promise.allSettled([
    fetchHtml(NEWS_URL, sourceId).then((html) => parseAnthropicNewsHtml(html, sourceId)),
    fetchHtml(RELEASE_NOTES_URL, sourceId).then((html) => parseAnthropicReleaseNotesHtml(html, sourceId)),
  ]);

  const items: RawItem[] = [];
  const failures: string[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.error(`[ingest] ${sourceId}: ${result.reason}`);
      failures.push(String(result.reason));
    }
  }
  if (failures.length === settled.length) {
    throw new Error(failures.join("; "));
  }
  return items;
}
