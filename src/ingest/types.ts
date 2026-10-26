/** A single parsed item from any source, before dedupe/enqueue. */
export interface RawItem {
  sourceId: string;
  url: string;
  /** Feed GUID when the source provides one; falls back to `url`. */
  guid: string;
  title: string;
  summary: string;
  publishedAt: string | null;
}

export interface IngestResult {
  sourceId: string;
  fetched: number;
  queued: number;
  error?: string;
}
