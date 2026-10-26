import { startScheduler } from "../ingest/runner.js";

console.log("Starting cron-style events polling (Luma iCal + PuneTech RSS)...");
const stop = startScheduler(6);

process.on("SIGINT", () => {
  console.log("\nStopping scheduler...");
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
