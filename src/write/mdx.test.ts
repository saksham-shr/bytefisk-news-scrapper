import assert from "node:assert/strict";
import { test } from "node:test";
import { renderEventMdx, renderNewsMdx } from "./mdx.js";
import type { EventFrontmatter, NewsFrontmatter } from "./types.js";

test("renderNewsMdx produces valid frontmatter and a summary + attribution link, no full article", () => {
  const frontmatter: NewsFrontmatter = {
    title: 'Startup raises $10M: "big round"',
    description: "Short description",
    date: "2026-10-26",
    category: "Funding",
    draft: false,
  };
  const mdx = renderNewsMdx(frontmatter, "A short summary of the article.", "https://example.com/article");

  assert.match(mdx, /^---\n/);
  assert.ok(mdx.includes(`title: ${JSON.stringify(frontmatter.title)}`), "title must be safely quoted/escaped");
  assert.match(mdx, /category: "Funding"/);
  assert.match(mdx, /draft: false/);
  assert.match(mdx, /\[Read more at the source\]\(https:\/\/example\.com\/article\)/);
  assert.ok(!mdx.includes("full article"), "body must not reproduce full article content");
});

test("renderEventMdx includes every field CLAUDE.md's events schema requires", () => {
  const frontmatter: EventFrontmatter = {
    title: "Community Meetup",
    description: "A local meetup",
    date: "2026-11-01",
    type: "Meetup",
    format: "In-Person",
    location: "Bengaluru",
    duration: "2 hours",
    price: "Free",
    registerUrl: "https://luma.com/example",
    ctaLabel: "Register",
    draft: false,
  };
  const mdx = renderEventMdx(frontmatter, "Join us!", "https://luma.com/example");
  for (const key of ["title", "description", "date", "type", "format", "location", "duration", "price", "registerUrl", "ctaLabel", "draft"]) {
    assert.match(mdx, new RegExp(`^${key}:`, "m"), `missing frontmatter field: ${key}`);
  }
});
