import { logFundingStatusOnce } from "./funding/checkFundingConfig.js";
import { runOnce } from "./ingest/runner.js";
import { sendPendingDigest } from "./notify/notifier.js";
import { writePendingItems } from "./write/writer.js";

/**
 * A single poll cycle covering CLAUDE.md steps 2-5: RSS/Atom ingestion,
 * scrape-fallback ingestion, the MDX writer, then the Telegram digest.
 *
 * Deliberately one-shot, not a long-running process — see runner.ts's
 * comment. Run this on a schedule from outside the repo (systemd timer
 * / cron entry); README documents the recommended cadence per source.
 * Events ingestion (step 6, buildStep 6) runs on its own much lower
 * cadence (daily) and is invoked separately via `npm run
 * poll:events:once`, not folded into this cycle.
 */
function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

async function main(): Promise<void> {
  console.log("Bytefisk News Scrapper — single poll cycle (CLAUDE.md steps 2-5)\n");

  logFundingStatusOnce();

  console.log("\n[step 2] RSS/Atom ingestion...");
  const newsResults = await runOnce(2);

  console.log("\n[step 3] Scrape-fallback ingestion...");
  const scrapeResults = await runOnce(3);

  console.log("\n[step 4] Writing MDX...");
  const writeResults = writePendingItems();

  console.log("\n[step 5] Telegram digest...");
  const notifyResult = await sendPendingDigest();

  const ingestResults = [...newsResults, ...scrapeResults];
  const fetched = sum(ingestResults.map((r) => r.fetched));
  const enqueued = sum(ingestResults.map((r) => r.queued));
  const ingestErrorCount = ingestResults.filter((r) => r.error).length;
  const skippedCount = ingestResults.filter((r) => r.skipped).length;
  const written = writeResults.filter((r) => r.path).length;
  const writeFailedCount = writeResults.filter((r) => r.error).length;

  console.log("\n--- Run summary ---");
  console.log(
    `  Sources polled:  ${ingestResults.length} total, ${skippedCount} not due yet, ${ingestErrorCount} error(s)`,
  );
  console.log(`  Items fetched:   ${fetched}`);
  console.log(`  Items enqueued:  ${enqueued}`);
  console.log(`  MDX written:     ${written}`);
  console.log(`  MDX failed:      ${writeFailedCount}`);
  if (notifyResult.skipped) {
    console.log("  Telegram:        skipped (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set)");
  } else if (notifyResult.error) {
    console.log(`  Telegram:        FAILED (${notifyResult.error})`);
  } else {
    console.log(
      `  Telegram:        ${notifyResult.itemCount} item(s) notified across ${notifyResult.messageCount} message(s)`,
    );
  }
  console.log(
    "\nEvents ingestion (step 6) isn't part of this cycle — run `npm run poll:events:once` " +
      "on its own daily schedule (see README).",
  );

  const hadFailure = ingestErrorCount > 0 || writeFailedCount > 0 || Boolean(notifyResult.error);
  process.exitCode = hadFailure ? 1 : 0;
}

main();
