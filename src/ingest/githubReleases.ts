import { githubReleasesWatchlist } from "../config/sources.js";
import { fetchFeeds } from "./feedParser.js";
import type { RawItem } from "./types.js";

/** Expand the §12 watch-list into concrete `.atom` URLs and fetch each. */
export async function fetchGithubReleases(sourceId: string): Promise<RawItem[]> {
  const urls = githubReleasesWatchlist.map(
    ({ owner, repo }) => `https://github.com/${owner}/${repo}/releases.atom`,
  );
  return fetchFeeds(urls, sourceId);
}
