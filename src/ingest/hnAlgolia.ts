import type { RawItem } from "./types.js";

/**
 * Per CLAUDE.md step 2 (section 6, HN Algolia only): substitute these
 * queries against hn.algolia.com/api/v1/search_by_date, tags=story.
 */
export const HN_ALGOLIA_QUERIES = [
  "Claude Code",
  "Codex",
  "Cursor",
  "MCP",
  "model context protocol",
  "agent skills",
  "AI agent",
];

interface HnAlgoliaHit {
  objectID: string;
  title?: string | null;
  story_text?: string | null;
  url?: string | null;
  created_at?: string | null;
}

interface HnAlgoliaResponse {
  hits?: HnAlgoliaHit[];
}

/** Parse an already-fetched HN Algolia search_by_date JSON response. */
export function parseHnAlgoliaResponse(json: HnAlgoliaResponse, sourceId: string): RawItem[] {
  return (json.hits ?? [])
    .filter((hit) => hit.title)
    .map((hit) => {
      const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
      return {
        sourceId,
        url: hit.url ?? hnUrl,
        guid: hnUrl,
        title: (hit.title ?? "").trim(),
        summary: (hit.story_text ?? "").trim(),
        publishedAt: hit.created_at ?? null,
      };
    });
}

const FETCH_TIMEOUT_MS = 15_000;

/** Fetch one HN Algolia query and parse its hits. */
async function fetchHnAlgoliaQuery(query: string, sourceId: string): Promise<RawItem[]> {
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=50`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  const json = (await res.json()) as HnAlgoliaResponse;
  return parseHnAlgoliaResponse(json, sourceId);
}

/**
 * Fetch every configured query and concatenate (dedupe happens downstream).
 * One query failing (e.g. a transient 5xx) shouldn't drop every other
 * query's results — only log-and-skip the failed one, unless all fail.
 */
export async function fetchHnAlgolia(sourceId: string): Promise<RawItem[]> {
  const settled = await Promise.allSettled(
    HN_ALGOLIA_QUERIES.map((query) => fetchHnAlgoliaQuery(query, sourceId)),
  );
  const items: RawItem[] = [];
  const failures: string[] = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      const message = `query "${HN_ALGOLIA_QUERIES[index]}" failed: ${result.reason}`;
      console.error(`[ingest] ${sourceId}: ${message}`);
      failures.push(message);
    }
  }
  if (failures.length > 0 && failures.length === HN_ALGOLIA_QUERIES.length) {
    throw new Error(failures.join("; "));
  }
  return items;
}
