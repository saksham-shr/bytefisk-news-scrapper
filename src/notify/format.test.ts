import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingQueueRow } from "../db/index.js";
import { buildDigestChunks, buildDigestMessages, TELEGRAM_MESSAGE_LIMIT } from "./format.js";

function row(overrides: Partial<PendingQueueRow>): PendingQueueRow {
  return {
    id: "id",
    source_id: "yourstory",
    url: "https://example.com/article",
    title: "Some Title",
    payload: JSON.stringify({ category: "Funding" }),
    collection: "news",
    status: "written",
    error: null,
    created_at: "2026-10-26T00:00:00.000Z",
    updated_at: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

test("buildDigestMessages returns nothing for an empty batch", () => {
  assert.deepEqual(buildDigestMessages([]), []);
});

test("buildDigestMessages groups news and events into one message for a small batch", () => {
  const rows = [
    row({ id: "a", title: "News item", collection: "news" }),
    row({ id: "b", title: "Event item", collection: "events", payload: JSON.stringify({ type: "Meetup" }) }),
  ];
  const messages = buildDigestMessages(rows);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /2 new item\(s\)/);
  assert.match(messages[0], /News \(1\)/);
  assert.match(messages[0], /Events \(1\)/);
  assert.match(messages[0], /<a href="https:\/\/example\.com\/article">News item<\/a> — Funding/);
  assert.match(messages[0], /<a href="https:\/\/example\.com\/article">Event item<\/a> — Meetup/);
});

test("buildDigestMessages escapes HTML in titles so a title can't break the markup", () => {
  const rows = [row({ id: "a", title: "<script>alert(1)</script> & co" })];
  const messages = buildDigestMessages(rows);
  assert.ok(!messages[0].includes("<script>"));
  assert.match(messages[0], /&lt;script&gt;/);
  assert.match(messages[0], /&amp; co/);
});

test("buildDigestMessages escapes a quote in the URL so it can't break out of the href attribute (regression)", () => {
  const rows = [row({ id: "a", url: 'https://example.com/article?x="><script>alert(1)</script>' })];
  const messages = buildDigestMessages(rows);
  assert.ok(!messages[0].includes('"><script>'), "a raw quote in the URL must not break out of href=\"...\"");
  assert.match(messages[0], /href="https:\/\/example\.com\/article\?x=&quot;&gt;&lt;script&gt;/);
});

test("buildDigestMessages truncates an extremely long title so one row can't blow out a whole chunk (regression)", () => {
  const hugeTitle = "x".repeat(10_000);
  const rows = [row({ id: "a", title: hugeTitle })];
  const messages = buildDigestMessages(rows);
  assert.equal(messages.length, 1);
  assert.ok(messages[0].length < TELEGRAM_MESSAGE_LIMIT, `expected a bounded message, got ${messages[0].length} chars`);
});

test("buildDigestMessages falls back to the row's collection when payload JSON can't be parsed", () => {
  const rows = [row({ id: "a", payload: "not json" })];
  const messages = buildDigestMessages(rows);
  assert.match(messages[0], /— news/);
});

test("buildDigestMessages splits into multiple messages rather than exceeding Telegram's limit", () => {
  const rows = Array.from({ length: 200 }, (_, i) =>
    row({ id: `item-${i}`, title: `A reasonably long headline about item number ${i} with some extra padding text` }),
  );
  const messages = buildDigestMessages(rows);
  assert.ok(messages.length > 1, "expected more than one message for a large batch");
  for (const message of messages) {
    assert.ok(message.length <= TELEGRAM_MESSAGE_LIMIT, `message exceeds Telegram's limit: ${message.length} chars`);
  }
  // every item must still appear exactly once across however many chunks
  for (let i = 0; i < 200; i++) {
    const occurrences = messages.filter((m) => m.includes(`item number ${i} `)).length;
    assert.equal(occurrences, 1, `item ${i} should appear in exactly one chunk`);
  }
});

test("buildDigestChunks tags each chunk with exactly the row ids whose lines landed in it", () => {
  const rows = Array.from({ length: 200 }, (_, i) =>
    row({ id: `item-${i}`, title: `A reasonably long headline about item number ${i} with some extra padding text` }),
  );
  const chunks = buildDigestChunks(rows);
  assert.ok(chunks.length > 1, "expected more than one chunk for a large batch");

  const allRowIds = chunks.flatMap((c) => c.rowIds);
  assert.equal(allRowIds.length, 200, "every row must be tagged to exactly one chunk");
  assert.equal(new Set(allRowIds).size, 200, "no row id should be tagged to more than one chunk");

  for (const chunk of chunks) {
    for (const id of chunk.rowIds) {
      const index = Number(id.replace("item-", ""));
      assert.ok(chunk.text.includes(`item number ${index} `), `chunk claims row ${id} but doesn't contain its line`);
    }
  }
});
