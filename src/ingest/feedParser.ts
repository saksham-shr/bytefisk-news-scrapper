import Parser from "rss-parser";
import type { RawItem } from "./types.js";

const parser = new Parser({ timeout: 15_000 });

/**
 * Parse already-fetched RSS or Atom XML text into RawItems.
 * Pure (no network) so it's unit-testable against fixtures — rss-parser
 * handles both RSS 2.0 and Atom transparently.
 */
export async function parseFeedText(xml: string, sourceId: string): Promise<RawItem[]> {
  const feed = await parser.parseString(xml);
  return feed.items.map((item) => {
    const url = item.link ?? "";
    const guid = item.guid ?? url;
    return {
      sourceId,
      url,
      guid,
      title: (item.title ?? "").trim(),
      summary: (item.contentSnippet ?? item.summary ?? item.content ?? "").trim(),
      publishedAt: item.isoDate ?? item.pubDate ?? null,
    };
  });
}

/** Fetch a single RSS/Atom URL and parse it. */
export async function fetchFeed(url: string, sourceId: string): Promise<RawItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)" },
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseFeedText(xml, sourceId);
}

/** Fetch one or more RSS/Atom URLs for a source and concatenate the items. */
export async function fetchFeeds(urls: string | string[], sourceId: string): Promise<RawItem[]> {
  const list = Array.isArray(urls) ? urls : [urls];
  const results = await Promise.all(list.map((url) => fetchFeed(url, sourceId)));
  return results.flat();
}
