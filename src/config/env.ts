import "dotenv/config";
import path from "node:path";

export interface EnvConfig {
  dbPath: string;
  bytefiskRepoPath: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  githubToken: string | null;
  semanticScholarApiKey: string | null;
}

function resolveFromCwd(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export const env: EnvConfig = {
  dbPath: resolveFromCwd(process.env.DB_PATH ?? "./data/scrapper.sqlite"),
  bytefiskRepoPath: resolveFromCwd(process.env.BYTEFISK_REPO_PATH ?? "../bytefisk"),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
  telegramChatId: process.env.TELEGRAM_CHAT_ID || null,
  githubToken: process.env.GITHUB_TOKEN || null,
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || null,
};
