import "dotenv/config";
import path from "node:path";

export interface EnvConfig {
  dbPath: string;
  bytefiskRepoPath: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  /** Overridable only for tests (points a local mock server instead of the real API). */
  telegramApiBaseUrl: string;
  githubToken: string | null;
  semanticScholarApiKey: string | null;
  /** Overridable only for tests (points a local mock server instead of the real site). */
  lumaCalendarUrl: string;
  /** Overridable only for tests (points a local mock server instead of the real site). */
  punetechSubscribePageUrl: string;
}

function resolveFromCwd(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

/**
 * Every field is a getter that re-reads `process.env` on each access,
 * rather than a value computed once at import time. ESM module caching is
 * keyed by this file's own path, not by any cache-busting query string a
 * caller's dynamic import of a *different* module used — so a plain
 * `export const env = {...}` computed eagerly would get permanently
 * frozen to whichever values were set the first time anything in the
 * process transitively imported this module (a real problem for tests
 * that set DB_PATH/BYTEFISK_REPO_PATH per-test). Lazy getters make every
 * access see the current process.env instead.
 */
export const env: EnvConfig = {
  get dbPath() {
    return resolveFromCwd(process.env.DB_PATH ?? "./data/scrapper.sqlite");
  },
  get bytefiskRepoPath() {
    return resolveFromCwd(process.env.BYTEFISK_REPO_PATH ?? "../bytefisk");
  },
  get telegramBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  },
  get telegramChatId() {
    return process.env.TELEGRAM_CHAT_ID || null;
  },
  get telegramApiBaseUrl() {
    return process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org";
  },
  get githubToken() {
    return process.env.GITHUB_TOKEN || null;
  },
  get semanticScholarApiKey() {
    return process.env.SEMANTIC_SCHOLAR_API_KEY || null;
  },
  get lumaCalendarUrl() {
    return process.env.LUMA_CALENDAR_URL || "https://luma.com/CommunityMeetups";
  },
  get punetechSubscribePageUrl() {
    return (
      process.env.PUNETECH_SUBSCRIBE_PAGE_URL ||
      "https://punetech.com/dont-miss-tech-events-subscribe-to-the-punetech-calendar/"
    );
  },
};
