import { env } from "../config/env.js";
import { telegramLimits } from "../config/notification.js";
import { getItemsByStatus, updatePendingStatus } from "../db/index.js";
import { buildDigestChunks } from "./format.js";
import { sendTelegramMessage } from "./telegram.js";

export interface NotifyResult {
  skipped: boolean;
  itemCount: number;
  messageCount: number;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch every `written`-but-not-yet-`notified` item into one Telegram
 * digest per CLAUDE.md step 5. If Telegram isn't configured
 * (TELEGRAM_BOT_TOKEN/CHAT_ID unset in .env, as .env.example documents),
 * this is a no-op, not an error — notifications are optional per
 * CLAUDE.md ("plus optional Telegram notification").
 *
 * Sends chunks one at a time (usually just one) and marks only a given
 * chunk's own rows `notified` once *that* chunk's send succeeds, rather
 * than all-or-nothing across the whole batch. That matters for a rare
 * multi-chunk digest: if chunk 2 fails after chunk 1 already reached the
 * real chat, chunk 1's rows must not be resent next run — only chunk 2's
 * (and any later) rows stay queued.
 */
export async function sendPendingDigest(
  pacingMs: number = Math.ceil(60_000 / telegramLimits.maxMessagesPerMinuteGroup),
): Promise<NotifyResult> {
  if (!env.telegramBotToken || !env.telegramChatId) {
    return { skipped: true, itemCount: 0, messageCount: 0 };
  }

  const rows = getItemsByStatus("written");
  if (rows.length === 0) {
    return { skipped: false, itemCount: 0, messageCount: 0 };
  }

  const chunks = buildDigestChunks(rows);
  let sentChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(pacingMs);
    try {
      await sendTelegramMessage(chunks[i].text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const remaining = chunks.slice(i).reduce((sum, c) => sum + c.rowIds.length, 0);
      console.error(
        `[notify] digest chunk ${i + 1}/${chunks.length} failed, ${remaining} item(s) stay queued for the next run: ${message}`,
      );
      return { skipped: false, itemCount: rows.length, messageCount: sentChunks, error: message };
    }
    for (const id of chunks[i].rowIds) updatePendingStatus(id, "notified");
    sentChunks += 1;
  }

  return { skipped: false, itemCount: rows.length, messageCount: sentChunks };
}
