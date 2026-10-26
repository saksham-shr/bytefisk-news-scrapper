import { env } from "../config/env.js";
import { getItemsByStatus, updatePendingStatus } from "../db/index.js";
import { buildDigestMessages } from "./format.js";
import { sendTelegramMessages } from "./telegram.js";

export interface NotifyResult {
  skipped: boolean;
  itemCount: number;
  messageCount: number;
  error?: string;
}

/**
 * Batch every `written`-but-not-yet-`notified` item into one Telegram
 * digest per CLAUDE.md step 5. If Telegram isn't configured
 * (TELEGRAM_BOT_TOKEN/CHAT_ID unset in .env, as .env.example documents),
 * this is a no-op, not an error — notifications are optional per
 * CLAUDE.md ("plus optional Telegram notification").
 *
 * Rows are only marked `notified` once every chunk of the digest sent
 * successfully. If sending fails partway (even after telegram.ts's own
 * retry_after handling), no row is marked notified — the same items get
 * batched into the next run's digest rather than silently disappearing,
 * at the cost of a possible duplicate message if a later chunk failed
 * after an earlier one already reached the chat.
 */
export async function sendPendingDigest(): Promise<NotifyResult> {
  if (!env.telegramBotToken || !env.telegramChatId) {
    return { skipped: true, itemCount: 0, messageCount: 0 };
  }

  const rows = getItemsByStatus("written");
  if (rows.length === 0) {
    return { skipped: false, itemCount: 0, messageCount: 0 };
  }

  const chunks = buildDigestMessages(rows);
  try {
    await sendTelegramMessages(chunks);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify] digest send failed, ${rows.length} item(s) stay queued for the next run: ${message}`);
    return { skipped: false, itemCount: rows.length, messageCount: chunks.length, error: message };
  }

  for (const row of rows) updatePendingStatus(row.id, "notified");
  return { skipped: false, itemCount: rows.length, messageCount: chunks.length };
}
