import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { enqueuePending, getItemsByStatus, itemId, markSeen, updatePendingStatus } from "../db/index.js";
import { useFreshDb } from "../testing/freshDb.js";
import { sendPendingDigest } from "./notifier.js";

async function withMockTelegram(
  handler: () => { status: number; body: unknown },
  run: () => Promise<void>,
): Promise<void> {
  const server: Server = createServer((req, res) => {
    req.on("data", () => {});
    req.on("end", () => {
      const { status, body } = handler();
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  process.env.TELEGRAM_API_BASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";

  try {
    await run();
  } finally {
    delete process.env.TELEGRAM_API_BASE_URL;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function seedWrittenItem(id: string) {
  markSeen({ id, sourceId: "yourstory", url: `https://example.com/${id}`, title: id });
  enqueuePending({
    id,
    sourceId: "yourstory",
    url: `https://example.com/${id}`,
    title: id,
    collection: "news",
    payload: { category: "Industry" },
  });
  updatePendingStatus(id, "written");
}

test("sendPendingDigest is a no-op (not an error) when Telegram isn't configured", async () => {
  const { cleanup } = useFreshDb();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

  const result = await sendPendingDigest();
  assert.equal(result.skipped, true);
  assert.equal(result.error, undefined);

  cleanup();
});

test("sendPendingDigest sends one digest and marks every written row notified", async () => {
  const { cleanup } = useFreshDb();
  const id = itemId("https://example.com/a");
  seedWrittenItem(id);

  await withMockTelegram(
    () => ({ status: 200, body: { ok: true } }),
    async () => {
      const result = await sendPendingDigest();
      assert.equal(result.skipped, false);
      assert.equal(result.itemCount, 1);
      assert.equal(result.messageCount, 1);
      assert.equal(result.error, undefined);
    },
  );

  const remaining = getItemsByStatus("written");
  assert.equal(remaining.length, 0, "the row should have moved out of 'written' once notified");

  cleanup();
});

test("sendPendingDigest leaves rows in 'written' (not notified) if the send fails, so the next run retries them", async () => {
  const { cleanup } = useFreshDb();
  const id = itemId("https://example.com/b");
  seedWrittenItem(id);

  await withMockTelegram(
    () => ({ status: 400, body: { ok: false, description: "chat not found" } }),
    async () => {
      const result = await sendPendingDigest();
      assert.ok(result.error);
    },
  );

  const remaining = getItemsByStatus("written");
  assert.equal(remaining.length, 1, "the row must still be queued for the next run, not lost");

  cleanup();
});

test("sendPendingDigest marks only the successfully-sent chunk's rows notified, leaving a later failed chunk's rows queued (regression: no duplicate re-send of already-delivered chunks)", async () => {
  const { cleanup } = useFreshDb();

  // Enough rows to force more than one chunk (see format.test.ts's identical sizing).
  const ids = Array.from({ length: 200 }, (_, i) => {
    const id = itemId(`https://example.com/item-${i}`);
    markSeen({ id, sourceId: "yourstory", url: `https://example.com/item-${i}`, title: `item-${i}` });
    enqueuePending({
      id,
      sourceId: "yourstory",
      url: `https://example.com/item-${i}`,
      title: `A reasonably long headline about item number ${i} with some extra padding text`,
      collection: "news",
      payload: { category: "Industry" },
    });
    updatePendingStatus(id, "written");
    return id;
  });

  let requestCount = 0;
  const server: Server = createServer((req, res) => {
    req.on("data", () => {});
    req.on("end", () => {
      requestCount += 1;
      const ok = requestCount === 1; // first chunk succeeds, every later one fails
      res.writeHead(ok ? 200 : 400, { "Content-Type": "application/json" });
      res.end(JSON.stringify(ok ? { ok: true } : { ok: false, description: "simulated failure" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");
  process.env.TELEGRAM_API_BASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";

  try {
    const result = await sendPendingDigest(0);
    assert.ok(result.error, "expected the second chunk to fail");
    assert.equal(result.messageCount, 1, "only the first chunk should count as sent");

    const stillWritten = getItemsByStatus("written");
    const nowNotified = getItemsByStatus("notified");

    assert.ok(stillWritten.length > 0, "the failed chunk's rows must stay queued");
    assert.ok(nowNotified.length > 0, "the successfully-sent chunk's rows must be marked notified");
    assert.equal(
      stillWritten.length + nowNotified.length,
      ids.length,
      "every row must be accounted for exactly once between written and notified",
    );
  } finally {
    delete process.env.TELEGRAM_API_BASE_URL;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    cleanup();
  }
});

test("sendPendingDigest does nothing when there are no written items", async () => {
  const { cleanup } = useFreshDb();
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";

  const result = await sendPendingDigest();
  assert.equal(result.skipped, false);
  assert.equal(result.itemCount, 0);

  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  cleanup();
});
