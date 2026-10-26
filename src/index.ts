import { env } from "./config/env.js";
import { sources, githubReleasesWatchlist } from "./config/sources.js";
import { getDb } from "./db/index.js";

function main(): void {
  const db = getDb();
  const counts = db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM seen_items) AS seen, (SELECT COUNT(*) FROM pending_queue) AS pending",
    )
    .get() as { seen: number; pending: number };

  const byStatus = sources.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log("Bytefisk News Scrapper — scaffold check");
  console.log(`  DB path:            ${env.dbPath}`);
  console.log(`  Bytefisk repo path: ${env.bytefiskRepoPath}`);
  console.log(`  Dedupe store:       ${counts.seen} seen item(s), ${counts.pending} pending item(s)`);
  console.log(`  Sources loaded:     ${sources.length} total`);
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`    ${status}: ${count}`);
  }
  console.log(`  GitHub release watch-list: ${githubReleasesWatchlist.length} repo(s)`);
  console.log("Scaffold ready. No ingestion is implemented yet (see CLAUDE.md step 2 onward).");
}

main();
