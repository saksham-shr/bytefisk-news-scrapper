import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseMetaNewsroomHtml } from "./metaNewsroom.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

test("parseMetaNewsroomHtml matches only dated article links, dedupes, and ignores index/careers links", () => {
  const items = parseMetaNewsroomHtml(fixture("meta-newsroom-sample.html"), "meta-newsroom");
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Meta announces new AI update");
  assert.equal(items[0].url, "https://about.fb.com/news/2026/10/meta-ai-update/");
  assert.equal(items[1].url, "https://about.fb.com/news/2026/09/quarterly-earnings/");
});

test("parseMetaNewsroomHtml throws when nothing matches the dated-link pattern", () => {
  assert.throws(() => parseMetaNewsroomHtml("<html><body><a href=\"/careers/\">Careers</a></body></html>", "meta-newsroom"), /drifted/);
});
