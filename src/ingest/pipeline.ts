import type { Source } from "../config/sources.js";
import { enqueuePending, getLastPolledAt, hasSeen, itemId, markSeen, recordPolled } from "../db/index.js";
import { fetchItemsForSource } from "./dispatch.js";
import type { IngestResult } from "./types.js";

/**
 * Has at least `source.pollMinutes` passed since this source was last
 * polled? There's no live scheduler in this repo (CLAUDE.md step 2-5 is
 * meant to be invoked by an external cron/systemd timer, see README) —
 * so instead of requiring one cron entry per source's own cadence, a
 * single frequent outer invocation can safely drive every source: a
 * fast source (e.g. Techmeme, 5 min) is due almost every run, while a
 * "be courteous" source (e.g. arXiv, documented as daily/6h in its
 * sources.ts `notes`) is skipped until its own cadence has actually
 * elapsed, regardless of how often the outer process runs.
 */
function isDueForPoll(source: Source): boolean {
  const lastPolledAt = getLastPolledAt(source.id);
  if (!lastPolledAt) return true;
  const elapsedMs = Date.now() - new Date(lastPolledAt).getTime();
  return elapsedMs >= source.pollMinutes * 60_000;
}

/**
 * Fetch one source, dedupe against seen_items, and enqueue anything new.
 * Never throws — a single bad source must not take down the whole poll —
 * failures are logged loudly and reflected in the returned result's
 * `error` field instead.
 */
export async function ingestSource(source: Source): Promise<IngestResult> {
  if (!isDueForPoll(source)) {
    return { sourceId: source.id, fetched: 0, queued: 0, skipped: true };
  }

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
  } finally {
    // Record the attempt even on failure — a persistently broken source
    // shouldn't be hammered every run just because it keeps erroring.
    recordPolled(source.id);
  }
}
