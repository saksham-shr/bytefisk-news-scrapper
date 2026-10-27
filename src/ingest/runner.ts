import type { BuildStep } from "../config/sources.js";
import { activeSourcesForStep } from "../config/sources.js";
import { ingestSource } from "./pipeline.js";
import type { IngestResult } from "./types.js";

/**
 * Poll every active source for a build step once, sequentially logged.
 *
 * Deliberately no scheduler/cron loop here — per CLAUDE.md this is a
 * single-shot pass, meant to be invoked by an external scheduler
 * (systemd timer / cron entry); see README's cadence table. Running a
 * long-lived setInterval process inside this repo would just be a
 * second, redundant scheduler to keep alive and debug. Each source
 * still only actually fetches once its own `pollMinutes` has elapsed
 * (pipeline.ts's isDueForPoll) — safe to call this often.
 */
export async function runOnce(step: BuildStep): Promise<IngestResult[]> {
  const sourcesForStep = activeSourcesForStep(step);
  const results: IngestResult[] = [];
  for (const source of sourcesForStep) {
    const result = await ingestSource(source);
    results.push(result);
    const status = result.error
      ? `ERROR: ${result.error}`
      : result.skipped
        ? "not due yet"
        : `${result.queued} new / ${result.fetched} fetched`;
    console.log(`[ingest] ${source.id}: ${status}`);
  }
  return results;
}
