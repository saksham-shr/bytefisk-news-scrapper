#!/usr/bin/env node
// Smallest-possible runnable check for the two things most likely to
// silently break and corrupt output: dedupe and category inference.
// Deliberately NOT a test-framework test (no node:test, no fixtures) —
// just plain assertions against inline data, meant to be fast enough to
// run before every deploy/poll cycle as a sanity gate.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "bytefisk-sanity-")), "check.sqlite");

const { itemId, hasSeen, markSeen, enqueuePending, getPendingItems, closeDb } = await import(
  "../src/db/index.ts"
);
const { classifyCategory } = await import("../src/write/classify.ts");

let failures = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ok  ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${label}`);
    console.error(`       ${err.message}`);
  }
}

console.log("Dedupe store:");

check("a never-seen URL hashes to a stable id and isn't already seen", () => {
  const id = itemId("https://example.com/sanity-check-article");
  assert.equal(id, itemId("https://example.com/sanity-check-article"), "itemId must be deterministic");
  assert.equal(hasSeen(id), false);
});

check("markSeen makes hasSeen true for that same id, and only that id", () => {
  const seenId = itemId("https://example.com/sanity-check-article");
  const otherId = itemId("https://example.com/a-different-article");
  markSeen({ id: seenId, sourceId: "sanity-check", url: "https://example.com/sanity-check-article" });
  assert.equal(hasSeen(seenId), true);
  assert.equal(hasSeen(otherId), false, "marking one item seen must not mark an unrelated item seen");
});

check("enqueuePending actually lands a 'pending' row for the write step to pick up", () => {
  const id = itemId("https://example.com/sanity-check-pending");
  enqueuePending({
    id,
    sourceId: "sanity-check",
    url: "https://example.com/sanity-check-pending",
    title: "Sanity check item",
    collection: "news",
    payload: { title: "Sanity check item" },
  });
  const pending = getPendingItems("news");
  assert.ok(
    pending.some((row) => row.id === id),
    "the enqueued row must be visible to getPendingItems",
  );
});

closeDb();

console.log("\nCategory inference (mapSection -> category table):");

const expectedCategories = [
  ["yourstory", "Funding"], // §1 India tech/startups/funding
  ["techcrunch", "Industry"], // §2 global tech news
  ["github-trending", "Open Source"], // §4
  ["hn-algolia", "Industry"], // §6 ecosystem discussion
  ["openai-news", "Launches"], // §6,7 dual-tagged official news
  ["google-ai-blog", "Launches"], // §7 official company news
  ["arxiv-api", "Industry"], // §8 research papers
  ["medianama", "Policy"], // §10 policy
  ["github-releases-watchlist", "Open Source"], // §12
  ["an-id-that-does-not-exist", "Industry"], // unmapped source -> default
];

for (const [sourceId, expected] of expectedCategories) {
  check(`${sourceId} -> ${expected}`, () => {
    assert.equal(classifyCategory(sourceId), expected);
  });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll sanity checks passed.");
