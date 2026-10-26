import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "./slugify.js";

test("slugify lowercases, strips punctuation, and appends a dedupe-id suffix", () => {
  const slug = slugify("Startup Raises $10M Seed Round!", "abcdef1234567890");
  assert.equal(slug, "startup-raises-10m-seed-round-abcdef12");
});

test("slugify gives distinct slugs for identical titles via the dedupe-id suffix", () => {
  const a = slugify("Weekly roundup", "1111111111111111");
  const b = slugify("Weekly roundup", "2222222222222222");
  assert.notEqual(a, b);
});

test("slugify falls back to just the suffix when the title has no usable characters", () => {
  assert.equal(slugify("!!!", "abcdef1234567890"), "abcdef12");
});

test("slugify never produces a double dash when truncation lands right after a dash run (regression)", () => {
  // 79 "a"s + a space + "b" normalizes to 79 "a"s + "-" + "b" (81 chars);
  // slicing to 80 chars lands exactly on the trailing "-", which must not
  // survive into the final slug as "...a--abcd1234".
  const title = `${"a".repeat(79)} b`;
  const slug = slugify(title, "abcdef1234567890");
  assert.ok(!slug.includes("--"), `expected no double dash, got: ${slug}`);
  assert.equal(slug, `${"a".repeat(79)}-abcdef12`);
});
