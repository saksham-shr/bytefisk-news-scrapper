import { env } from "../../config/env.js";
import { discoverLinkUrl } from "./discoverFeedUrl.js";
import { parseIcalText, type EventRawItem } from "./ical.js";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "bytefisk-news-scrapper/0.1 (+https://github.com/saksham-shr/bytefisk)";

async function fetchText(url: string, sourceId: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  return res.text();
}

/**
 * Luma's calendar page links to a per-calendar iCal "Subscribe" URL
 * rather than exposing one at a fixed path (TECH_NEWS_SOURCE_MAP.md
 * §11) — discover it first, then fetch and parse the actual feed.
 */
export async function fetchLumaEvents(sourceId: string): Promise<EventRawItem[]> {
  const calendarUrl = env.lumaCalendarUrl;
  const landingHtml = await fetchText(calendarUrl, sourceId);
  const icsUrl = discoverLinkUrl(
    landingHtml,
    calendarUrl,
    [/\.ics(\?|$)/i, /^webcal:/i],
    "iCal subscribe link",
  );
  const icsText = await fetchText(icsUrl.replace(/^webcal:/i, "https:"), sourceId);
  return parseIcalText(icsText, sourceId, calendarUrl);
}
