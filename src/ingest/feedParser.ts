import Parser from "rss-parser";
import type { RawItem } from "./types.js";

const parser = new Parser();
const FETCH_TIMEOUT_MS = 15_000;

interface FeedItem extends Parser.Item {
  /** rss-parser maps an Atom entry's <id> here — RSS's <guid> stays on `guid`. */
  id?: string;
}

/**
 * Parse already-fetched RSS or Atom XML text into RawItems.
 * Pure (no network) so it's unit-testable against fixtures — rss-parser
 * handles both RSS 2.0 and Atom transparently.
 *
 * Items with neither a stable identifier (Atom <id> / RSS <guid>) nor a
 * link are skipped and logged rather than enqueued with a collision-prone
 * empty-string id.
 */
export async function parseFeedText(xml: string, sourceId: string): Promise<RawItem[]> {
  const feed = await parser.parseString(xml);
  const items: RawItem[] = [];
  for (const item of feed.items as FeedItem[]) {
    const url = item.link ?? "";
    const guid = item.id ?? item.guid ?? url;
    if (!guid) {
      console.error(`[ingest] ${sourceId}: skipping item with no guid/id/link (title: ${item.title ?? "<untitled>"})`);
      continue;
    }
    items.push({
      sourceId,
      url,
      guid,
      title: (item.title ?? "").trim(),
      summary: (item.contentSnippet ?? item.summary ?? item.content ?? "").trim(),
      publishedAt: item.isoDate ?? item.pubDate ?? null,
    });
  }
  return items;
}

/** Fetch a single RSS/Atom URL and parse it. */
export async function fetchFeed(url: string, sourceId: string): Promise<RawItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseFeedText(xml, sourceId);
}

/**
 * Fetch one or more RSS/Atom URLs for a source and concatenate the items.
 * A failing URL is logged and skipped rather than failing every other URL
 * for the same source (e.g. Moneycontrol's two feeds).
 */
export async function fetchFeeds(urls: string | string[], sourceId: string): Promise<RawItem[]> {
  const list = Array.isArray(urls) ? urls : [urls];
  const settled = await Promise.allSettled(list.map((url) => fetchFeed(url, sourceId)));
  const items: RawItem[] = [];
  const failures: string[] = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      const message = `${list[index]} failed: ${result.reason}`;
      console.error(`[ingest] ${sourceId}: ${message}`);
      failures.push(message);
    }
  }
  // Only a URL or two failing in a multi-URL source (e.g. Moneycontrol) is a
  // partial degradation, logged above and otherwise tolerated. Every URL
  // failing is a total outage for this source — surface it as an error so
  // callers see it, not just the console.
  if (failures.length > 0 && failures.length === list.length) {
    throw new Error(failures.join("; "));
  }
  return items;
}
