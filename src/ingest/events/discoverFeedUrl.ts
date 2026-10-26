import * as cheerio from "cheerio";

/**
 * Some landing pages (Luma's public calendar, PuneTech's subscribe-info
 * page) don't expose a fixed feed URL — the real iCal/RSS endpoint is
 * linked from the page and "must be grabbed from that calendar's page,
 * not guessed" (TECH_NEWS_SOURCE_MAP.md §11). Tries each pattern in
 * order against every link's href and returns the first match, resolved
 * to an absolute URL. Throws if nothing matches, so a redesigned page
 * fails loud instead of silently losing the calendar/feed.
 */
export function discoverLinkUrl(
  html: string,
  baseUrl: string,
  patterns: RegExp[],
  description: string,
): string {
  const $ = cheerio.load(html);
  const hrefs = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href): href is string => Boolean(href));

  for (const pattern of patterns) {
    const match = hrefs.find((href) => pattern.test(href));
    if (match) return new URL(match, baseUrl).toString();
  }

  throw new Error(`could not find a ${description} on ${baseUrl} — page structure likely drifted`);
}
