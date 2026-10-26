import assert from "node:assert/strict";
import { test } from "node:test";
import { useFreshDb } from "../testing/freshDb.js";
import { enqueuePending, getDb, hasSeen, itemId, markSeen } from "./index.js";

test("dedupe store: markSeen + hasSeen + enqueuePending round trip", () => {
  const { cleanup } = useFreshDb();

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

  cleanup();
});
