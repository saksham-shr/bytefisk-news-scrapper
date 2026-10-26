import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseHnAlgoliaResponse } from "./hnAlgolia.js";

test("parseHnAlgoliaResponse maps hits and drops titleless entries", () => {
  const json = JSON.parse(
    readFileSync(fileURLToPath(new URL("./__fixtures__/hn-algolia-sample.json", import.meta.url)), "utf8"),
  );
  const items = parseHnAlgoliaResponse(json, "hn-algolia");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Claude Code now supports MCP servers");
  assert.equal(items[0].url, "https://example.com/claude-code-mcp");
  assert.equal(items[0].sourceId, "hn-algolia");
});
