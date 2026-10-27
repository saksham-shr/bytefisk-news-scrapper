import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { sources, type Source } from "../config/sources.js";
import { getDb } from "../db/index.js";
import { useFreshDb } from "../testing/freshDb.js";
import { ingestSource } from "./pipeline.js";

test("ingestSource reports errors instead of throwing (fail loud, don't crash the run)", async () => {
  const { cleanup } = useFreshDb("bytefisk-pipeline-test-");

  const brokenSource: Source = {
    id: "unsupported-test-source",
    name: "Unsupported",
    mapSection: "0",
    type: "api",
    url: "https://example.com/does-not-matter",
    auth: "open",
    cadence: "Poll 15 min",
    pollMinutes: 15,
    buildStep: 2,
    status: "active",
  };

  const result = await ingestSource(brokenSource);
  assert.equal(result.fetched, 0);
  assert.equal(result.queued, 0);
  assert.ok(result.error, "expected an error message, not a thrown exception");
  assert.match(result.error ?? "", /no ingester wired up/);

  cleanup();
});

test("ingestSource skips a source whose pollMinutes hasn't elapsed since its last poll, even across errors", async () => {
  const { cleanup } = useFreshDb("bytefisk-pipeline-due-test-");

  const brokenSource: Source = {
    id: "unsupported-test-source",
    name: "Unsupported",
    mapSection: "0",
    type: "api",
    url: "https://example.com/does-not-matter",
    auth: "open",
    cadence: "Poll 15 min",
    pollMinutes: 15,
    buildStep: 2,
    status: "active",
  };

  const first = await ingestSource(brokenSource);
  assert.ok(first.error, "first call should attempt the fetch and hit the normal 'no ingester' error");
  assert.equal(first.skipped, undefined);

  const second = await ingestSource(brokenSource);
  assert.equal(second.skipped, true, "second call within pollMinutes must be skipped, not re-attempted");
  assert.equal(second.error, undefined);
  assert.equal(second.fetched, 0);
  assert.equal(second.queued, 0);

  cleanup();
});

test("ingestSource enqueues a buildStep-6 (events) source's items under collection 'events', not 'news' (regression)", async () => {
  const { cleanup } = useFreshDb("bytefisk-pipeline-events-test-");

  const server: Server = createServer((req, res) => {
    if (req.url === "/ics/cal.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.end(
        [
          "BEGIN:VCALENDAR",
          "BEGIN:VEVENT",
          "UID:a@example.com",
          "SUMMARY:Test Meetup",
          "DTSTART:20261101T120000Z",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\n"),
      );
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><a href="/ics/cal.ics">Subscribe (iCal)</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = process.env.LUMA_CALENDAR_URL;
  process.env.LUMA_CALENDAR_URL = `http://127.0.0.1:${address.port}`;

  try {
    const lumaSource = sources.find((s) => s.id === "luma-community-meetups");
    assert.ok(lumaSource, "expected luma-community-meetups to still be configured in sources.ts");
    assert.equal(lumaSource?.buildStep, 6);

    const result = await ingestSource(lumaSource!);
    assert.equal(result.error, undefined);
    assert.equal(result.queued, 1);

    const row = getDb().prepare("SELECT collection FROM pending_queue").get() as { collection: string };
    assert.equal(row.collection, "events");
  } finally {
    process.env.LUMA_CALENDAR_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    cleanup();
  }
});
