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

test("renderNewsMdx truncates an extremely long summary instead of reproducing the full article (regression)", () => {
  // Real-world trigger: GitHub's releases.atom puts the *entire*
  // changelog in its content field — this simulates that shape.
  const fullChangelog = Array.from({ length: 50 }, (_, i) => `[commit${i}] - some change (author) #${1000 + i}`).join(
    "\n",
  );
  const frontmatter: NewsFrontmatter = {
    title: "Version 1.2.3",
    description: "desc",
    date: "2026-10-26",
    category: "Open Source",
    draft: false,
  };
  const mdx = renderNewsMdx(frontmatter, fullChangelog, "https://github.com/example/repo/releases/tag/v1.2.3");

  assert.ok(fullChangelog.length > 600, "fixture must actually exceed the cap to exercise truncation");
  const body = mdx.split("---\n")[2]; // after the two frontmatter "---" delimiters
  assert.ok(body.length < fullChangelog.length, "body must be shorter than the full changelog");
  assert.ok(body.length < 700, `expected a capped body, got ${body.length} chars`);
  assert.ok(!mdx.includes("commit49"), "the tail of a long changelog must not survive truncation");
  assert.match(mdx, /…/, "a truncated summary should be marked with an ellipsis");
});

test("renderNewsMdx escapes line/paragraph separator and NEL instead of leaving them as literal line breaks inside the YAML scalar (regression)", () => {
  // Built from code points, not \u escapes, so the literal separator
  // characters actually land in the test's input string (that's the
  // point — simulating a scraped headline that carries one of these in).
  const lineSeparator = String.fromCodePoint(8232);
  const paragraphSeparator = String.fromCodePoint(8233);
  const nextLine = String.fromCodePoint(133);
  const frontmatter: NewsFrontmatter = {
    title: `Title with a${lineSeparator}line separator and${paragraphSeparator}paragraph separator and${nextLine}next line`,
    description: "desc",
    date: "2026-10-26",
    category: "Industry",
    draft: false,
  };
  const mdx = renderNewsMdx(frontmatter, "summary", "https://example.com/article");
  const titleLine = mdx.split("\n")[1];
  assert.match(titleLine, /^title: "/);
  assert.ok(!titleLine.includes(lineSeparator));
  assert.ok(!titleLine.includes(paragraphSeparator));
  assert.ok(!titleLine.includes(nextLine));
  assert.match(titleLine, /\\u2028/);
  assert.match(titleLine, /\\u2029/);
  assert.match(titleLine, /\\u0085/);
  // the frontmatter block must still close after exactly 5 fields (title
  // didn't split into extra "lines" because of an unescaped separator)
  assert.equal(mdx.split("\n").slice(0, 7)[6], "---");
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
