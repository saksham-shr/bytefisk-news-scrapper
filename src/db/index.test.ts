import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("dedupe store: markSeen + hasSeen + enqueuePending round trip", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bytefisk-db-test-"));
  process.env.DB_PATH = join(dir, "test.sqlite");

  // Fresh import so env.ts picks up DB_PATH set just above.
  const { itemId, hasSeen, markSeen, enqueuePending, getDb } = await import(
    `./index.js?t=${Date.now()}`
  );

  const id = itemId("https://example.com/some-article");
  assert.equal(hasSeen(id), false);

  markSeen({ id, sourceId: "unit-test", url: "https://example.com/some-article", title: "Title" });
  assert.equal(hasSeen(id), true);

  enqueuePending({
    id,
    sourceId: "unit-test",
    url: "https://example.com/some-article",
    title: "Title",
    collection: "news",
    payload: { foo: "bar" },
  });

  const row = getDb().prepare("SELECT * FROM pending_queue WHERE id = ?").get(id) as
    | { collection: string; status: string }
    | undefined;
  assert.ok(row);
  assert.equal(row?.collection, "news");
  assert.equal(row?.status, "pending");

  rmSync(dir, { recursive: true, force: true });
});
