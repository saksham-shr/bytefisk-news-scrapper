import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { sendTelegramMessage, sendTelegramMessages } from "./telegram.js";

type RequestLog = Array<{ body: unknown }>;

async function withMockTelegram(
  handler: (attempt: number, body: unknown) => { status: number; body: unknown },
  run: (log: RequestLog) => Promise<void>,
): Promise<void> {
  const log: RequestLog = [];
  let attempt = 0;
  const server: Server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      log.push({ body });
      attempt += 1;
      const { status, body: responseBody } = handler(attempt, body);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(responseBody));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = {
    base: process.env.TELEGRAM_API_BASE_URL,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chat: process.env.TELEGRAM_CHAT_ID,
  };
  process.env.TELEGRAM_API_BASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";

  try {
    await run(log);
  } finally {
    process.env.TELEGRAM_API_BASE_URL = previous.base;
    process.env.TELEGRAM_BOT_TOKEN = previous.token;
    process.env.TELEGRAM_CHAT_ID = previous.chat;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("sendTelegramMessage posts chat_id/text/parse_mode and succeeds on a 200 ok response", async () => {
  await withMockTelegram(
    () => ({ status: 200, body: { ok: true } }),
    async (log) => {
      await sendTelegramMessage("hello world");
      assert.equal(log.length, 1);
      const body = log[0].body as Record<string, unknown>;
      assert.equal(body.chat_id, "12345");
      assert.equal(body.text, "hello world");
      assert.equal(body.parse_mode, "HTML");
    },
  );
});

test("sendTelegramMessage retries after a 429's retry_after and succeeds on the next attempt", async () => {
  await withMockTelegram(
    (attempt) =>
      attempt === 1
        ? { status: 429, body: { ok: false, parameters: { retry_after: 0 } } }
        : { status: 200, body: { ok: true } },
    async (log) => {
      await sendTelegramMessage("hello");
      assert.equal(log.length, 2, "expected one failed attempt and one successful retry");
    },
  );
});

test("sendTelegramMessage throws after exhausting retries on repeated 429s", async () => {
  await withMockTelegram(
    () => ({ status: 429, body: { ok: false, parameters: { retry_after: 0 } } }),
    async () => {
      await assert.rejects(() => sendTelegramMessage("hello"), /exhausted \d+ retries/);
    },
  );
});

test("sendTelegramMessage throws with Telegram's own description on a non-429 error", async () => {
  await withMockTelegram(
    () => ({ status: 400, body: { ok: false, description: "chat not found" } }),
    async () => {
      await assert.rejects(() => sendTelegramMessage("hello"), /chat not found/);
    },
  );
});

test("sendTelegramMessages sends every chunk in order", async () => {
  await withMockTelegram(
    () => ({ status: 200, body: { ok: true } }),
    async (log) => {
      await sendTelegramMessages(["first", "second", "third"], 0);
      assert.deepEqual(
        log.map((entry) => (entry.body as Record<string, unknown>).text),
        ["first", "second", "third"],
      );
    },
  );
});

test("sendTelegramMessage throws immediately when the bot token/chat id aren't configured", async () => {
  const previous = { token: process.env.TELEGRAM_BOT_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
  process.env.TELEGRAM_BOT_TOKEN = "";
  process.env.TELEGRAM_CHAT_ID = "";
  try {
    await assert.rejects(() => sendTelegramMessage("hello"), /not configured/);
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = previous.token;
    process.env.TELEGRAM_CHAT_ID = previous.chat;
  }
});
