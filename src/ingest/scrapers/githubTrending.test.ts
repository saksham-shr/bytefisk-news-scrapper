import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseGithubTrendingHtml } from "./githubTrending.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

test("parseGithubTrendingHtml extracts repo links and descriptions", () => {
  const items = parseGithubTrendingHtml(fixture("github-trending-sample.html"), "github-trending");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "anthropics/claude-code");
  assert.equal(items[0].url, "https://github.com/anthropics/claude-code");
  assert.equal(items[0].guid, items[0].url);
  assert.equal(items[0].summary, "An agentic coding CLI.");
  assert.equal(items[1].title, "example/no-description");
  assert.equal(items[1].summary, "");
});

test("parseGithubTrendingHtml throws on selector drift (0 repos parsed) instead of returning an empty list silently", () => {
  assert.throws(() => parseGithubTrendingHtml("<html><body>no repos here</body></html>", "github-trending"), /drifted/);
});
