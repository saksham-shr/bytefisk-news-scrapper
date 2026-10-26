import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { enqueuePending, getDb, itemId, markSeen } from "../db/index.js";
import { useFreshDbAndRepo } from "../testing/freshDb.js";
import { writePendingItems } from "./writer.js";

test("writePendingItems writes a news MDX file matching CLAUDE.md's schema and marks the row written", () => {
  const { repoDir, cleanup } = useFreshDbAndRepo();

  const id = itemId("https://example.com/startup-raises-funding");
  markSeen({ id, sourceId: "yourstory", url: "https://example.com/startup-raises-funding", title: "x" });
  enqueuePending({
    id,
    sourceId: "yourstory",
    url: "https://example.com/startup-raises-funding",
    title: "Startup raises $10M Series A",
    collection: "news",
    payload: {
      sourceId: "yourstory",
      url: "https://example.com/startup-raises-funding",
      guid: "https://example.com/startup-raises-funding",
      title: "Startup raises $10M Series A",
      summary: "A local startup announced a new funding round.",
      publishedAt: "2026-10-20T00:00:00Z",
    },
  });

  const results = writePendingItems("news");
  assert.equal(results.length, 1);
  assert.ok(results[0].path, results[0].error ?? "expected a written path");
  assert.ok(existsSync(results[0].path!));

  const contents = readFileSync(results[0].path!, "utf8");
  assert.match(contents, /category: "Funding"/);
  assert.match(contents, /date: "2026-10-20"/);
  assert.match(contents, /draft: false/);
  assert.ok(results[0].path!.startsWith(join(repoDir, "src", "content", "news")));

  const row = getDb().prepare("SELECT status FROM pending_queue WHERE id = ?").get(id) as { status: string };
  assert.equal(row.status, "written");

  cleanup();
});

test("writePendingItems writes an events MDX file with CLAUDE.md's required fields, falling back to defaults for missing ones", () => {
  const { repoDir, cleanup } = useFreshDbAndRepo();

  const id = itemId("https://luma.com/example-meetup");
  markSeen({ id, sourceId: "luma-community-meetups", url: "https://luma.com/example-meetup", title: "x" });
  enqueuePending({
    id,
    sourceId: "luma-community-meetups",
    url: "https://luma.com/example-meetup",
    title: "Bengaluru AI Meetup",
    collection: "events",
    payload: {
      sourceId: "luma-community-meetups",
      url: "https://luma.com/example-meetup",
      guid: "https://luma.com/example-meetup",
      title: "Bengaluru AI Meetup",
      summary: "Monthly meetup for AI builders.",
      publishedAt: "2026-11-01T18:00:00Z",
    },
  });

  const results = writePendingItems("events");
  assert.equal(results.length, 1);
  assert.ok(results[0].path);

  const contents = readFileSync(results[0].path!, "utf8");
  assert.match(contents, /type: "Meetup"/);
  assert.match(contents, /format: "Virtual"/);
  assert.match(contents, /registerUrl: "https:\/\/luma\.com\/example-meetup"/);
  assert.match(contents, /ctaLabel: "Register"/);
  assert.ok(results[0].path!.startsWith(join(repoDir, "src", "content", "events")));

  cleanup();
});

test("writePendingItems marks a row failed (not pending forever) when its payload is malformed, and keeps going", () => {
  const { cleanup } = useFreshDbAndRepo();

  const id = itemId("https://example.com/broken");
  getDb()
    .prepare(
      `INSERT INTO pending_queue (id, source_id, url, title, payload, collection) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, "yourstory", "https://example.com/broken", "Broken", "not valid json", "news");

  const results = writePendingItems("news");
  assert.equal(results.length, 1);
  assert.ok(results[0].error);

  const row = getDb().prepare("SELECT status, error FROM pending_queue WHERE id = ?").get(id) as {
    status: string;
    error: string;
  };
  assert.equal(row.status, "failed");
  assert.ok(row.error);

  cleanup();
});
