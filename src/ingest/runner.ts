import type { BuildStep, Source } from "../config/sources.js";
import { activeSourcesForStep } from "../config/sources.js";
import { ingestSource } from "./pipeline.js";
import type { IngestResult } from "./types.js";

/** Poll every active source for a build step once, sequentially logged. */
export async function runOnce(step: BuildStep): Promise<IngestResult[]> {
  const sourcesForStep = activeSourcesForStep(step);
  const results: IngestResult[] = [];
  for (const source of sourcesForStep) {
    const result = await ingestSource(source);
    results.push(result);
    const status = result.error ? `ERROR: ${result.error}` : `${result.queued} new / ${result.fetched} fetched`;
    console.log(`[ingest] ${source.id}: ${status}`);
  }
  return results;
}

interface ScheduledSource {
  source: Source;
  timer: NodeJS.Timeout;
}

/**
 * Cron-style polling: each active source for the step is polled on its own
 * interval, taken straight from `source.pollMinutes` (no shared tick).
 * Returns a stop function that clears every interval.
 */
export function startScheduler(step: BuildStep): () => void {
  const scheduled: ScheduledSource[] = activeSourcesForStep(step).map((source) => {
    const intervalMs = source.pollMinutes * 60_000;
    void ingestSource(source).then((result) => {
      console.log(`[scheduler] ${source.id} initial poll: ${result.queued} new / ${result.fetched} fetched`);
    });
    const timer = setInterval(() => {
      void ingestSource(source).then((result) => {
        console.log(`[scheduler] ${source.id}: ${result.queued} new / ${result.fetched} fetched`);
      });
    }, intervalMs);
    return { source, timer };
  });

  return () => {
    for (const { timer } of scheduled) clearInterval(timer);
  };
}
