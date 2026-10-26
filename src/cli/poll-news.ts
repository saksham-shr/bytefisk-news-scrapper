import { startScheduler } from "../ingest/runner.js";

console.log("Starting cron-style RSS/Atom polling for build-step-2 sources (CLAUDE.md §2)...");
const stop = startScheduler(2);

process.on("SIGINT", () => {
  console.log("\nStopping scheduler...");
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
