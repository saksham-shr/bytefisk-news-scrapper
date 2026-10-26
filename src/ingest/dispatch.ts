import type { Source } from "../config/sources.js";
import { fetchLumaEvents } from "./events/luma.js";
import { fetchPunetechEvents } from "./events/punetech.js";
import { fetchFeeds } from "./feedParser.js";
import { fetchGithubReleases } from "./githubReleases.js";
import { fetchHnAlgolia } from "./hnAlgolia.js";
import { fetchAnthropicNews } from "./scrapers/anthropicNews.js";
import { fetchGithubTrending } from "./scrapers/githubTrending.js";
import { fetchMetaNewsroom } from "./scrapers/metaNewsroom.js";
import { fetchSemanticScholar } from "./semanticScholar.js";
import type { RawItem } from "./types.js";

/**
 * Per-source fetch dispatch. Most `rss`/`atom` sources share the generic
 * feed fetcher; a few `api` sources (and the templated releases watch-list)
 * need their own request/response shape, as do the three scrape-fallback
 * sources named in CLAUDE.md step 3 and the two events sources in step 6.
 */
export async function fetchItemsForSource(source: Source): Promise<RawItem[]> {
  switch (source.id) {
    case "hn-algolia":
      return fetchHnAlgolia(source.id);
    case "semantic-scholar":
      return fetchSemanticScholar(source.id);
    case "github-releases-watchlist":
      return fetchGithubReleases(source.id);
    case "github-trending":
      return fetchGithubTrending(source.id);
    case "anthropic-news":
      return fetchAnthropicNews(source.id);
    case "meta-newsroom":
      return fetchMetaNewsroom(source.id);
    case "luma-community-meetups":
      return fetchLumaEvents(source.id);
    case "punetech-events":
      return fetchPunetechEvents(source.id);
    default:
      break;
  }

  switch (source.type) {
    case "rss":
    case "atom":
      return fetchFeeds(source.url, source.id);
    default:
      throw new Error(
        `${source.id}: no ingester wired up for source type "${source.type}" (id has no special-case dispatch either)`,
      );
  }
}
