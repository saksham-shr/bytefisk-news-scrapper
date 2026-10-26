/**
 * Telegram digest notifier config — TECH_NEWS_SOURCE_MAP.md §13.
 * Rate limits below are transcribed from that section, not invented;
 * the actual notifier (CLAUDE.md build step 5) enforces them.
 */
export const telegramLimits = {
  maxMessagesPerSecondPrivateChat: 1,
  maxMessagesPerMinuteGroup: 20,
  maxMessagesPerSecondBroadcast: 30,
  /** One batched digest message per run, per CLAUDE.md step 5. */
  batchPerRun: true,
};
