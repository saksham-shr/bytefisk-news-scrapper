import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseAnthropicNewsHtml, parseAnthropicReleaseNotesHtml } from "./anthropicNews.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

test("parseAnthropicNewsHtml extracts /news/ links, dedupes, and skips the bare /news/ index link", () => {
  const items = parseAnthropicNewsHtml(fixture("anthropic-news-sample.html"), "anthropic-news");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Introducing Claude Opus 5.5");
  assert.equal(items[0].url, "https://www.anthropic.com/news/claude-opus-5-5");
  assert.equal(items[1].url, "https://www.anthropic.com/news/claude-code-updates");
});

test("parseAnthropicNewsHtml throws when nothing matches", () => {
  assert.throws(() => parseAnthropicNewsHtml("<html><body>nothing</body></html>", "anthropic-news"), /drifted/);
});

test("parseAnthropicReleaseNotesHtml turns each heading into an item with the following paragraph as summary", () => {
  const items = parseAnthropicReleaseNotesHtml(fixture("anthropic-release-notes-sample.html"), "anthropic-news");
  assert.equal(items.length, 3);
  assert.equal(items[0].title, "October 26, 2026");
  assert.equal(items[0].url, "https://docs.anthropic.com/en/release-notes/overview#2026-10-26");
  assert.match(items[0].summary, /widget API/);
  assert.equal(items[2].summary, "");
});
