import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseSemanticScholarResponse } from "./semanticScholar.js";

test("parseSemanticScholarResponse maps papers and drops titleless entries", () => {
  const json = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./__fixtures__/semantic-scholar-sample.json", import.meta.url)),
      "utf8",
    ),
  );
  const items = parseSemanticScholarResponse(json, "semantic-scholar");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Coding Agents: A Survey");
  assert.equal(items[0].url, "https://www.semanticscholar.org/paper/abc123");
  assert.equal(items[0].publishedAt, "2026-10-20");
});
