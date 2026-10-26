import type { EventFrontmatter, NewsFrontmatter } from "./types.js";

// Unicode line separator, paragraph separator, and NEL (decimal code
// points, not \u escapes, so no literal separator character ends up
// sitting in this source file). YAML 1.1 still treats these as line
// breaks even inside a double-quoted scalar, but JSON.stringify leaves
// them unescaped — real headlines occasionally carry one in from
// JS-encoded source text, so yamlString escapes them explicitly below.
const LINE_BREAK_LOOKALIKE_CODE_POINTS = [8232, 8233, 133];

/**
 * YAML double-quoted scalar escaping for plain ASCII/Unicode text
 * (titles/descriptions). JSON's string escaping covers the characters
 * that would otherwise break out of a double-quoted scalar or fake a new
 * frontmatter key (", \, and the C0 control chars, including literal
 * newlines/tabs) — compatible with YAML's own double-quoted escaping for
 * those. See LINE_BREAK_LOOKALIKE_CODE_POINTS above for the three it
 * doesn't cover.
 */
function yamlString(value: string): string {
  let escaped = JSON.stringify(value);
  for (const codePoint of LINE_BREAK_LOOKALIKE_CODE_POINTS) {
    const ch = String.fromCodePoint(codePoint);
    const hex = codePoint.toString(16).padStart(4, "0");
    escaped = escaped.split(ch).join(`\\u${hex}`);
  }
  return escaped;
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
