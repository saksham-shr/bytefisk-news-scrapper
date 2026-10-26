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
