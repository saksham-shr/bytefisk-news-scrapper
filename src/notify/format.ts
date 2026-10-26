import type { PendingQueueRow } from "../db/index.js";

/** Telegram's hard limit on a single sendMessage's text, minus a safety margin. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;
const SAFE_CHUNK_LIMIT = TELEGRAM_MESSAGE_LIMIT - 100;

/** Caps how much of a (possibly scraper-drift-garbled) title one line can spend. */
const MAX_TITLE_DISPLAY_LENGTH = 300;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

interface DigestEntry {
  row: PendingQueueRow;
  category: string;
}

function entryLine(entry: DigestEntry): string {
  // escapeHtml covers `"` too: `link` is interpolated inside a
  // double-quoted href attribute, so an unescaped quote in a scraped URL
  // (plausible — CLAUDE.md warns scrapers can drift) would otherwise
  // break out of the attribute and inject markup.
  const title = escapeHtml(truncate(entry.row.title || entry.row.url, MAX_TITLE_DISPLAY_LENGTH));
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

interface DigestLine {
  text: string;
  /** Which pending_queue row this line represents, if any (headers don't). */
  rowId?: string;
}

function buildLines(rows: PendingQueueRow[]): DigestLine[] {
  const news = rows.filter((r) => r.collection === "news");
  const events = rows.filter((r) => r.collection === "events");

  const lines: DigestLine[] = [{ text: `🗞 <b>Bytefisk News Scrapper</b> — ${rows.length} new item(s)` }];
  if (news.length > 0) {
    lines.push({ text: "" }, { text: `📰 <b>News (${news.length})</b>` });
    for (const row of news) lines.push({ text: entryLine({ row, category: categoryFor(row) }), rowId: row.id });
  }
  if (events.length > 0) {
    lines.push({ text: "" }, { text: `📅 <b>Events (${events.length})</b>` });
    for (const row of events) lines.push({ text: entryLine({ row, category: categoryFor(row) }), rowId: row.id });
  }
  return lines;
}

export interface DigestChunk {
  text: string;
  /** Row ids whose lines ended up in this chunk — see notifier.ts. */
  rowIds: string[];
}

/** Pack lines into as few messages as possible, never splitting a line. */
function chunkLines(lines: DigestLine[]): DigestChunk[] {
  const chunks: DigestChunk[] = [];
  let text = "";
  let rowIds: string[] = [];

  for (const line of lines) {
    const candidate = text ? `${text}\n${line.text}` : line.text;
    if (candidate.length > SAFE_CHUNK_LIMIT && text) {
      chunks.push({ text, rowIds });
      text = line.text;
      rowIds = line.rowId ? [line.rowId] : [];
    } else {
      text = candidate;
      if (line.rowId) rowIds.push(line.rowId);
    }
  }
  if (text) chunks.push({ text, rowIds });
  return chunks;
}

/**
 * CLAUDE.md step 5: "one message batching new items per run". Builds the
 * digest as one HTML string per chunk, only splitting into more than one
 * chunk if the batch would exceed Telegram's 4096-char message limit —
 * the common case is exactly one chunk. Each chunk also carries which
 * row ids it covers, so notifier.ts can mark only those rows `notified`
 * once that specific chunk's send succeeds, instead of all-or-nothing
 * across the whole batch (which would re-send already-delivered chunks
 * on a later chunk's failure).
 */
export function buildDigestChunks(rows: PendingQueueRow[]): DigestChunk[] {
  if (rows.length === 0) return [];
  return chunkLines(buildLines(rows));
}

/** Convenience wrapper for callers that only need the message text. */
export function buildDigestMessages(rows: PendingQueueRow[]): string[] {
  return buildDigestChunks(rows).map((chunk) => chunk.text);
}
