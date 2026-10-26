import type { EventFrontmatter, NewsFrontmatter } from "./types.js";

/**
 * YAML double-quoted scalar escaping for plain ASCII/Unicode text with no
 * embedded newlines (titles/descriptions). JSON's string escaping is a
 * compatible subset of YAML's for this case, so JSON.stringify gives us
 * a safe quoted scalar without pulling in a YAML library.
 */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

function frontmatterBlock(fields: Array<[string, string]>): string {
  const lines = fields.map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** Body = short summary + source attribution link, never the full article. */
function bodyWithAttribution(summary: string, sourceUrl: string): string {
  const paragraph = summary.trim() || "No summary was provided by the source feed.";
  return `${paragraph}\n\n[Read more at the source](${sourceUrl})\n`;
}

export function renderNewsMdx(frontmatter: NewsFrontmatter, summary: string, sourceUrl: string): string {
  const fm = frontmatterBlock([
    ["title", yamlString(frontmatter.title)],
    ["description", yamlString(frontmatter.description)],
    ["date", yamlString(frontmatter.date)],
    ["category", yamlString(frontmatter.category)],
    ["draft", String(frontmatter.draft)],
  ]);
  return `${fm}\n${bodyWithAttribution(summary, sourceUrl)}`;
}

export function renderEventMdx(frontmatter: EventFrontmatter, summary: string, sourceUrl: string): string {
  const fm = frontmatterBlock([
    ["title", yamlString(frontmatter.title)],
    ["description", yamlString(frontmatter.description)],
    ["date", yamlString(frontmatter.date)],
    ["type", yamlString(frontmatter.type)],
    ["format", yamlString(frontmatter.format)],
    ["location", yamlString(frontmatter.location)],
    ["duration", yamlString(frontmatter.duration)],
    ["price", yamlString(frontmatter.price)],
    ["registerUrl", yamlString(frontmatter.registerUrl)],
    ["ctaLabel", yamlString(frontmatter.ctaLabel)],
    ["draft", String(frontmatter.draft)],
  ]);
  return `${fm}\n${bodyWithAttribution(summary, sourceUrl)}`;
}
