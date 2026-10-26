import type { PendingQueueRow } from "../db/index.js";

/** Telegram's hard limit on a single sendMessage's text, minus a safety margin. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;
const SAFE_CHUNK_LIMIT = TELEGRAM_MESSAGE_LIMIT - 100;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface DigestEntry {
  row: PendingQueueRow;
  category: string;
}

function entryLine(entry: DigestEntry): string {
  const title = escapeHtml(entry.row.title || entry.row.url);
  const link = escapeHtml(entry.row.url);
  return `• <a href="${link}">${title}</a> — ${escapeHtml(entry.category)}`;
}

function categoryFor(row: PendingQueueRow): string {
  try {
    const payload = JSON.parse(row.payload) as { category?: string; type?: string };
    return payload.category ?? payload.type ?? row.collection;
  } catch {
    return row.collection;
  }
}

/**
 * CLAUDE.md step 5: "one message batching new items per run". Builds the
 * single digest as one HTML string, then — only if it would exceed
 * Telegram's 4096-char message limit — splits it into the fewest
 * possible additional messages rather than silently truncating content.
 */
export function buildDigestMessages(rows: PendingQueueRow[]): string[] {
  if (rows.length === 0) return [];

  const news = rows.filter((r) => r.collection === "news");
  const events = rows.filter((r) => r.collection === "events");

  const lines: string[] = [`🗞 <b>Bytefisk News Scrapper</b> — ${rows.length} new item(s)`];
  if (news.length > 0) {
    lines.push("", `📰 <b>News (${news.length})</b>`);
    for (const row of news) lines.push(entryLine({ row, category: categoryFor(row) }));
  }
  if (events.length > 0) {
    lines.push("", `📅 <b>Events (${events.length})</b>`);
    for (const row of events) lines.push(entryLine({ row, category: categoryFor(row) }));
  }

  return chunkLines(lines);
}

/** Pack lines into as few messages as possible, never splitting a line. */
function chunkLines(lines: string[]): string[] {
  const messages: string[] = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > SAFE_CHUNK_LIMIT && current) {
      messages.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) messages.push(current);
  return messages;
}
