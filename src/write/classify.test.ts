import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyCategory } from "./classify.js";

test("classifyCategory: github-trending and the releases watch-list are always Open Source", () => {
  assert.equal(classifyCategory("github-trending", "some repo", "a description"), "Open Source");
  assert.equal(classifyCategory("github-releases-watchlist", "node v22.0.0", "release notes"), "Open Source");
});

test("classifyCategory: funding wording wins over everything else", () => {
  assert.equal(
    classifyCategory("yourstory", "Startup raises $10M Series B led by investors", "announces new launch too"),
    "Funding",
  );
});

test("classifyCategory: policy wording", () => {
  assert.equal(classifyCategory("medianama", "Government proposes new data policy bill", ""), "Policy");
});

test("classifyCategory: launch wording", () => {
  assert.equal(classifyCategory("techcrunch", "Company launches new AI product", ""), "Launches");
});

test("classifyCategory: falls back to Industry when nothing matches", () => {
  assert.equal(classifyCategory("techcrunch", "Quarterly earnings beat expectations", ""), "Industry");
});
