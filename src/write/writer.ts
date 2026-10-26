import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "../config/env.js";
import { getPendingItems, updatePendingStatus, type PendingQueueRow } from "../db/index.js";
import type { RawItem } from "../ingest/types.js";
import { classifyCategory } from "./classify.js";
import { renderEventMdx, renderNewsMdx } from "./mdx.js";
import { slugify } from "./slugify.js";
import type { EventFrontmatter, EventPayloadExtras, NewsFrontmatter } from "./types.js";

export interface WriteResult {
  id: string;
  collection: "news" | "events";
  path?: string;
  error?: string;
}

function outputDirFor(collection: "news" | "events"): string {
  return join(env.bytefiskRepoPath, "src", "content", collection);
}

function isoDateOnly(value: string | null): string {
  const d = value ? new Date(value) : new Date();
  const time = d.getTime();
  return (Number.isNaN(time) ? new Date() : d).toISOString().slice(0, 10);
}

function buildNewsMdx(row: PendingQueueRow, item: RawItem): string {
  const frontmatter: NewsFrontmatter = {
    title: item.title || row.title || row.url,
    description: (item.summary || item.title || "").slice(0, 280),
    date: isoDateOnly(item.publishedAt),
    category: classifyCategory(item.sourceId, item.title, item.summary),
    draft: false,
  };
  return renderNewsMdx(frontmatter, item.summary, item.url);
}

function buildEventMdx(row: PendingQueueRow, item: RawItem & EventPayloadExtras): string {
  const frontmatter: EventFrontmatter = {
    title: item.title || row.title || row.url,
    description: (item.summary || item.title || "").slice(0, 280),
    date: isoDateOnly(item.publishedAt),
    type: item.type ?? "Meetup",
    format: item.format ?? "Virtual",
    location: item.location ?? "TBA",
    duration: item.duration ?? "TBA",
    price: item.price ?? "Free",
    registerUrl: item.registerUrl ?? item.url ?? "#",
    ctaLabel: "Register",
    draft: false,
  };
  return renderEventMdx(frontmatter, item.summary, item.url);
}

/**
 * Write every pending_queue row (optionally scoped to one collection) out
 * as an MDX file under `<bytefiskRepoPath>/src/content/<collection>/`.
 * A single bad row (malformed payload, filesystem error) is recorded as
 * `failed` with its error and the run continues — it never aborts the
 * rest of the batch.
 */
export function writePendingItems(collection?: "news" | "events"): WriteResult[] {
  const rows = getPendingItems(collection);
  const results: WriteResult[] = [];

  for (const row of rows) {
    try {
      const item = JSON.parse(row.payload) as RawItem & EventPayloadExtras;
      const mdx = row.collection === "events" ? buildEventMdx(row, item) : buildNewsMdx(row, item);
      const slug = slugify(item.title || row.title || row.url, row.id);
      const dir = outputDirFor(row.collection);
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `${slug}.mdx`);

      if (existsSync(path)) {
        // Extremely unlikely given the dedupe-id suffix, but don't silently
        // clobber another item's file if it ever happens.
        throw new Error(`refusing to overwrite existing file at ${path}`);
      }
      writeFileSync(path, mdx, "utf8");

      updatePendingStatus(row.id, "written");
      results.push({ id: row.id, collection: row.collection, path });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[write] ${row.id} (${row.source_id}) failed: ${message}`);
      updatePendingStatus(row.id, "failed", message);
      results.push({ id: row.id, collection: row.collection, error: message });
    }
  }

  return results;
}
