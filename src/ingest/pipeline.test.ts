import assert from "node:assert/strict";
import { test } from "node:test";
import type { Source } from "../config/sources.js";
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
