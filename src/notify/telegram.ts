import { env } from "../config/env.js";
import { telegramLimits } from "../config/notification.js";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
  parameters?: { retry_after?: number };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send one message via the Telegram Bot API, retrying on a 429's
 * `retry_after` (TECH_NEWS_SOURCE_MAP.md §13) up to MAX_RETRIES times.
 * Throws if the bot token/chat id aren't configured, or every retry is
 * exhausted — callers decide what "fail loud" means for a notify run.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  if (!env.telegramBotToken || !env.telegramChatId) {
    throw new Error("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not configured");
  }

  const url = `${env.telegramApiBaseUrl}/bot${env.telegramBotToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: env.telegramChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as TelegramApiResponse | null;

    if (res.ok && json?.ok) return;

    const retryAfterSeconds = json?.parameters?.retry_after;
    if (res.status === 429 && retryAfterSeconds !== undefined) {
      if (attempt < MAX_RETRIES) {
        console.error(
          `[notify] Telegram rate-limited (429), retrying in ${retryAfterSeconds}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(retryAfterSeconds * 1000);
        continue;
      }
      throw new Error(`Telegram sendMessage failed: exhausted ${MAX_RETRIES} retries after repeated 429s`);
    }

    throw new Error(`Telegram sendMessage failed: HTTP ${res.status} ${json?.description ?? ""}`.trim());
  }

  // Unreachable: every iteration above either returns or throws. Kept so
  // TypeScript can see every path returns/throws without a non-null
  // assertion, since it can't prove a for-loop is exhaustive on its own.
  throw new Error("Telegram sendMessage failed: exhausted retries after repeated 429s");
}

/**
 * Send several message chunks in order. Paced at the more conservative
 * of TECH_NEWS_SOURCE_MAP.md §13's two steady-state limits (20/min for a
 * group chat, vs. 1/sec for a private chat) since we don't know which
 * kind of chat TELEGRAM_CHAT_ID points at. In the common case this is
 * exactly one message and the pacing never applies.
 */
export async function sendTelegramMessages(
  chunks: string[],
  pacingMs: number = Math.ceil(60_000 / telegramLimits.maxMessagesPerMinuteGroup),
): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(pacingMs);
    await sendTelegramMessage(chunks[i]);
  }
}
