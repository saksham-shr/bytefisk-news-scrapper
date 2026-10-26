import type { Source } from "../config/sources.js";
import { enqueuePending, hasSeen, itemId, markSeen } from "../db/index.js";
import { fetchItemsForSource } from "./dispatch.js";
import type { IngestResult } from "./types.js";

/**
 * Fetch one source, dedupe against seen_items, and enqueue anything new.
 * Never throws — a single bad source must not take down the whole poll —
 * failures are logged loudly and reflected in the returned result's
 * `error` field instead.
 */
export async function ingestSource(source: Source): Promise<IngestResult> {
  try {
    const items = await fetchItemsForSource(source);
    const collection = source.buildStep === 6 ? "events" : "news";
    let queued = 0;
    for (const item of items) {
      const id = itemId(item.guid || item.url);
      if (hasSeen(id)) continue;
      markSeen({ id, sourceId: item.sourceId, url: item.url, title: item.title });
      enqueuePending({
        id,
        sourceId: item.sourceId,
        url: item.url,
        title: item.title,
        collection,
        payload: item,
      });
      queued += 1;
    }
    return { sourceId: source.id, fetched: items.length, queued };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingest] ${source.id} failed: ${message}`);
    return { sourceId: source.id, fetched: 0, queued: 0, error: message };
  }
}
