import DatabaseConstructor, { type Database } from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));

let db: Database | null = null;

export function getDb(): Database {
  if (db) return db;

  mkdirSync(dirname(env.dbPath), { recursive: true });
  db = new DatabaseConstructor(env.dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(readFileSync(schemaPath, "utf8"));
  return db;
}

/** Stable dedupe key for an item: sha256 of its canonical URL (or GUID). */
export function itemId(canonicalUrlOrGuid: string): string {
  return createHash("sha256").update(canonicalUrlOrGuid).digest("hex");
}

export function hasSeen(id: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM seen_items WHERE id = ?")
    .get(id);
  return row !== undefined;
}

export interface SeenItemInput {
  id: string;
  sourceId: string;
  url: string;
  title?: string;
}

export function markSeen(item: SeenItemInput): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO seen_items (id, source_id, url, title) VALUES (?, ?, ?, ?)",
    )
    .run(item.id, item.sourceId, item.url, item.title ?? null);
}

export interface PendingQueueInput extends SeenItemInput {
  payload: unknown;
  collection: "news" | "events";
}

export function enqueuePending(item: PendingQueueInput): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO pending_queue (id, source_id, url, title, payload, collection)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.id,
      item.sourceId,
      item.url,
      item.title ?? null,
      JSON.stringify(item.payload),
      item.collection,
    );
}

export interface PendingQueueRow {
  id: string;
  source_id: string;
  url: string;
  title: string | null;
  payload: string;
  collection: "news" | "events";
  status: "pending" | "written" | "notified" | "failed";
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type PendingStatus = PendingQueueRow["status"];

/** Items in a given status (optionally scoped to one collection), oldest first. */
export function getItemsByStatus(
  status: PendingStatus,
  collection?: "news" | "events",
): PendingQueueRow[] {
  const db = getDb();
  if (collection) {
    return db
      .prepare("SELECT * FROM pending_queue WHERE status = ? AND collection = ? ORDER BY created_at ASC")
      .all(status, collection) as PendingQueueRow[];
  }
  return db
    .prepare("SELECT * FROM pending_queue WHERE status = ? ORDER BY created_at ASC")
    .all(status) as PendingQueueRow[];
}

/** Pending items for a collection (or every collection), oldest first. */
export function getPendingItems(collection?: "news" | "events"): PendingQueueRow[] {
  return getItemsByStatus("pending", collection);
}

export function updatePendingStatus(
  id: string,
  status: "written" | "notified" | "failed",
  error?: string,
): void {
  getDb()
    .prepare(
      "UPDATE pending_queue SET status = ?, error = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .run(status, error ?? null, id);
}

/** ISO timestamp of the last time this source was polled, or null if never. */
export function getLastPolledAt(sourceId: string): string | null {
  const row = getDb()
    .prepare("SELECT last_polled_at FROM source_poll_state WHERE source_id = ?")
    .get(sourceId) as { last_polled_at: string } | undefined;
  return row?.last_polled_at ?? null;
}

/** Records "we polled this source now" — see pipeline.ts's isDueForPoll. */
export function recordPolled(sourceId: string): void {
  getDb()
    .prepare(
      `INSERT INTO source_poll_state (source_id, last_polled_at)
       VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(source_id) DO UPDATE SET last_polled_at = excluded.last_polled_at`,
    )
    .run(sourceId);
}

export function closeDb(): void {
  db?.close();
  db = null;
}
