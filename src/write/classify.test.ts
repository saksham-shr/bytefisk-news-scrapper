import assert from "node:assert/strict";
import { test } from "node:test";
import { sources } from "../config/sources.js";
import { classifyCategory } from "./classify.js";

test("classifyCategory: §1 India tech/startups/funding sources map to Funding", () => {
  assert.equal(classifyCategory("yourstory"), "Funding");
  assert.equal(classifyCategory("business-standard-tech"), "Funding");
});

test("classifyCategory: §2 global tech news sources map to Industry", () => {
  assert.equal(classifyCategory("techcrunch"), "Industry");
  assert.equal(classifyCategory("techmeme"), "Industry");
});

test("classifyCategory: §4 GitHub Trending and §12 releases watch-list map to Open Source", () => {
  assert.equal(classifyCategory("github-trending"), "Open Source");
  assert.equal(classifyCategory("github-releases-watchlist"), "Open Source");
});

test("classifyCategory: §6 HN Algolia (ecosystem discussion) maps to Industry", () => {
  assert.equal(classifyCategory("hn-algolia"), "Industry");
});

test("classifyCategory: §6,7 dual-tagged OpenAI/Anthropic and plain §7 company news map to Launches", () => {
  assert.equal(classifyCategory("openai-news"), "Launches");
  assert.equal(classifyCategory("anthropic-news"), "Launches");
  assert.equal(classifyCategory("google-ai-blog"), "Launches");
  assert.equal(classifyCategory("meta-newsroom"), "Launches");
});

test("classifyCategory: §8 research papers map to Industry", () => {
  assert.equal(classifyCategory("arxiv-api"), "Industry");
  assert.equal(classifyCategory("semantic-scholar"), "Industry");
});

test("classifyCategory: §10 policy sources map to Policy", () => {
  assert.equal(classifyCategory("medianama"), "Policy");
  assert.equal(classifyCategory("techcrunch-gov-policy"), "Policy");
});

test("classifyCategory: falls back to Industry for an unknown source id", () => {
  assert.equal(classifyCategory("not-a-real-source-id"), "Industry");
});

test("classifyCategory: every active, buildStep 2/3 (news-collection) source in sources.ts resolves to a real category, never throwing or returning something unmapped", () => {
  const newsSources = sources.filter(
    (s) => s.status === "active" && (s.buildStep === 2 || s.buildStep === 3),
  );
  assert.ok(newsSources.length > 0, "expected at least one active news source to check against");
  const validCategories = new Set(["Funding", "Launches", "Industry", "Policy", "Open Source"]);
  for (const source of newsSources) {
    const category = classifyCategory(source.id);
    assert.ok(
      validCategories.has(category),
      `source ${source.id} (mapSection ${source.mapSection}) resolved to an invalid category: ${category}`,
    );
  }
});
