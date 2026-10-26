import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb } from "../db/index.js";

/**
 * `getDb()` (src/db/index.ts) caches one connection per process. Setting
 * DB_PATH alone doesn't move an already-open connection, so any test that
 * wants its own isolated database must call closeDb() right after setting
 * DB_PATH — the next getDb() call then reopens at the new path. (env.ts's
 * fields are plain getters that re-read process.env on every access, so
 * this closeDb() call is the only reset actually needed — no dynamic
 * import/cache-busting required.)
 *
 * This matters beyond db/index.test.ts itself: anything that *statically*
 * imports "../db/index.js" (pipeline.ts, writer.ts, …) shares that same
 * one cached connection, so tests exercising those modules need this too.
 */
export function useFreshDb(prefix = "bytefisk-db-test-"): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  process.env.DB_PATH = join(dir, "test.sqlite");
  closeDb();
  return {
    dir,
    cleanup: () => {
      closeDb();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Like useFreshDb, but also points BYTEFISK_REPO_PATH at a fresh temp dir. */
export function useFreshDbAndRepo(): { dbDir: string; repoDir: string; cleanup: () => void } {
  const { dir: dbDir, cleanup: cleanupDb } = useFreshDb();
  const repoDir = mkdtempSync(join(tmpdir(), "bytefisk-repo-test-"));
  process.env.BYTEFISK_REPO_PATH = repoDir;
  return {
    dbDir,
    repoDir,
    cleanup: () => {
      cleanupDb();
      rmSync(repoDir, { recursive: true, force: true });
    },
  };
}
