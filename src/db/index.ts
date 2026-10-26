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

export function closeDb(): void {
  db?.close();
  db = null;
}
