import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingQueueRow } from "../db/index.js";
import { buildDigestMessages, TELEGRAM_MESSAGE_LIMIT } from "./format.js";

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
