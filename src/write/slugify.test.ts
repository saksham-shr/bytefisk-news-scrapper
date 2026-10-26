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
