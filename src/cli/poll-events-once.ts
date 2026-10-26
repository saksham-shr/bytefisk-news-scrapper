import { runOnce } from "../ingest/runner.js";

const results = await runOnce(6);
const totalQueued = results.reduce((sum, r) => sum + r.queued, 0);
const errors = results.filter((r) => r.error);
console.log(`\nDone: ${totalQueued} new item(s) queued across ${results.length} source(s), ${errors.length} error(s).`);
process.exit(errors.length > 0 ? 1 : 0);
