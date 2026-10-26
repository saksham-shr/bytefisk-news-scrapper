import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Source } from "../config/sources.js";

test("ingestSource reports errors instead of throwing (fail loud, don't crash the run)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bytefisk-pipeline-test-"));
  process.env.DB_PATH = join(dir, "test.sqlite");

  const { ingestSource } = await import(`./pipeline.js?t=${Date.now()}`);

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

  rmSync(dir, { recursive: true, force: true });
});
