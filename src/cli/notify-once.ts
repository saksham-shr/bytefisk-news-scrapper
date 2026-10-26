import { sendPendingDigest } from "../notify/notifier.js";

const result = await sendPendingDigest();

if (result.skipped) {
  console.log("[notify] Telegram not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID unset) — skipping.");
} else if (result.error) {
  console.error(`[notify] failed: ${result.error}`);
} else if (result.itemCount === 0) {
  console.log("[notify] nothing to notify.");
} else {
  console.log(`[notify] sent ${result.messageCount} message(s) covering ${result.itemCount} item(s).`);
}

process.exit(result.error ? 1 : 0);
