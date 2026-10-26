-- Dedupe store: every item (by canonical URL/GUID hash) we've ever ingested,
-- across every source, so a later poll never re-processes it.
CREATE TABLE IF NOT EXISTS seen_items (
  id TEXT PRIMARY KEY,                 -- sha256 of the canonical URL or feed GUID
  source_id TEXT NOT NULL,             -- matches Source.id in src/config/sources.ts
  url TEXT NOT NULL,
  title TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_seen_items_source ON seen_items (source_id);

-- Queue of items pending MDX write / Telegram notification.
CREATE TABLE IF NOT EXISTS pending_queue (
  id TEXT PRIMARY KEY,                 -- same id as seen_items for the same item
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  payload TEXT NOT NULL,               -- raw parsed item, JSON-encoded
  collection TEXT NOT NULL CHECK (collection IN ('news', 'events')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'written', 'notified', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_queue_status ON pending_queue (status);
