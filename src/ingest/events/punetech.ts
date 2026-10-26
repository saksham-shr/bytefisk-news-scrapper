import { env } from "../../config/env.js";
import { fetchFeeds } from "../feedParser.js";
import type { RawItem } from "../types.js";
import { discoverLinkUrl } from "./discoverFeedUrl.js";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)";

/**
 * The PuneTech events calendar's RSS URL is linked from this subscribe
 * page rather than a fixed endpoint (TECH_NEWS_SOURCE_MAP.md §11) —
 * discover it first, then reuse the generic RSS/Atom fetcher from
 * issue #1. Items come back as plain RawItems (no event-specific
 * type/format/location/etc.) — writer.ts already falls back to
 * CLAUDE.md's stated defaults for whatever a payload doesn't carry.
 */
export async function fetchPunetechEvents(sourceId: string): Promise<RawItem[]> {
  const subscribePageUrl = env.punetechSubscribePageUrl;
  const res = await fetch(subscribePageUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${subscribePageUrl} -> HTTP ${res.status}`);
  }
  const html = await res.text();
  const feedUrl = discoverLinkUrl(
    html,
    subscribePageUrl,
    [/feed/i, /\.xml(\?|$)/i, /rss/i],
    "RSS feed link",
  );
  return fetchFeeds(feedUrl, sourceId);
}
