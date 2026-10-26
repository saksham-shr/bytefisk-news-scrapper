import { env } from "../config/env.js";
import type { RawItem } from "./types.js";

/** Per TECH_NEWS_SOURCE_MAP.md §8 example query. */
const DEFAULT_QUERY = "coding agents";

interface SemanticScholarPaper {
  paperId: string;
  title?: string | null;
  abstract?: string | null;
  url?: string | null;
  publicationDate?: string | null;
}

interface SemanticScholarResponse {
  data?: SemanticScholarPaper[];
}

export function parseSemanticScholarResponse(
  json: SemanticScholarResponse,
  sourceId: string,
): RawItem[] {
  return (json.data ?? [])
    .filter((paper) => paper.title)
    .map((paper) => {
      const url = paper.url ?? `https://www.semanticscholar.org/paper/${paper.paperId}`;
      return {
        sourceId,
        url,
        guid: url,
        title: (paper.title ?? "").trim(),
        summary: (paper.abstract ?? "").trim(),
        publishedAt: paper.publicationDate ?? null,
      };
    });
}

const FETCH_TIMEOUT_MS = 15_000;

export async function fetchSemanticScholar(
  sourceId: string,
  query: string = DEFAULT_QUERY,
): Promise<RawItem[]> {
  const url =
    "https://api.semanticscholar.org/graph/v1/paper/search" +
    `?query=${encodeURIComponent(query)}&limit=100` +
    "&fields=title,abstract,year,publicationDate,url";
  const res = await fetch(url, {
    headers: env.semanticScholarApiKey ? { "x-api-key": env.semanticScholarApiKey } : {},
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${sourceId}: GET ${url} -> HTTP ${res.status}`);
  }
  const json = (await res.json()) as SemanticScholarResponse;
  return parseSemanticScholarResponse(json, sourceId);
}
