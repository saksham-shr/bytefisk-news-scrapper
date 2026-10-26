import { writePendingItems } from "../write/writer.js";

const results = writePendingItems();
const written = results.filter((r) => r.path);
const failed = results.filter((r) => r.error);

for (const r of written) console.log(`[write] ${r.collection}: ${r.path}`);
console.log(`\nDone: ${written.length} file(s) written, ${failed.length} failed, ${results.length} pending item(s) processed.`);
process.exit(failed.length > 0 ? 1 : 0);
