import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseFeedText } from "./feedParser.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

test("parseFeedText parses RSS 2.0 items", async () => {
  const items = await parseFeedText(fixture("sample-rss.xml"), "sample-rss");
  assert.equal(items.length, 2);
  assert.equal(items[0].sourceId, "sample-rss");
  assert.equal(items[0].title, "Startup raises $10M seed round");
  assert.equal(items[0].url, "https://example.com/news/startup-seed-round");
  assert.equal(items[0].guid, "https://example.com/news/startup-seed-round");
  assert.ok(items[0].publishedAt);
  assert.match(items[0].summary, /short summary/);
});

test("parseFeedText parses Atom entries the same way as RSS", async () => {
  const items = await parseFeedText(fixture("sample-atom.xml"), "sample-atom");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "arXiv paper: Coding agents that plan");
  assert.equal(items[0].url, "https://arxiv.org/abs/2026.00001");
  assert.match(items[0].summary, /planning coding agents/);
});
