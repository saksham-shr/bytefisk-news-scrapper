# Bytefisk News Scrapper

24/7 tech-news monitor for [Bytefisk](https://github.com/saksham-shr/bytefisk) — India-focused tech/startup news plus global tech, funding, GitHub Trending, Product Hunt, research papers, policy, and events. Polls verified open sources, dedupes, and writes new items into Bytefisk's `src/content/news` and `src/content/events` MDX collections.

## What this is

A standalone scraper/ingestion service, separate from the Bytefisk public site repo. It does not render any pages, has no hosted database, and no secrets leave the machine — it only reads a local SQLite dedupe store and writes `.mdx` files (plus an optional Telegram digest). A human (or Bytefisk's own admin panel) still reviews, commits, and pushes that output to go live — this repo never writes to the live site directly.

See [`TECH_NEWS_SOURCE_MAP.md`](./TECH_NEWS_SOURCE_MAP.md) for the full researched source list (endpoints, auth, cadence, fallbacks) and [`CLAUDE.md`](./CLAUDE.md) for the build spec (tech stack, output schema, scope).

## Setup

```sh
npm install
cp .env.example .env
```

Edit `.env`:
- `BYTEFISK_REPO_PATH` — a local clone of the [Bytefisk](https://github.com/saksham-shr/bytefisk) site repo. MDX output goes under `<BYTEFISK_REPO_PATH>/src/content/{news,events}/`.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — optional. Leave blank to skip the digest notifier cleanly (it logs and exits 0, never crashes the run).
- `GITHUB_TOKEN`, `SEMANTIC_SCHOLAR_API_KEY` — optional, raise rate limits for sources that are otherwise open without a key.
- `TRACXN_API_KEY` / `CRUNCHBASE_API_KEY` — optional. Neither is provisioned by default, so step 7 (structured funding ingestion) isn't built; funding signal comes from the India news RSS sources (step 2) instead. See `src/funding/checkFundingConfig.ts`.

## How it runs

There's no scheduler process in this repo — each command below is a single pass that exits when done. Run them on a schedule with your platform's own scheduler (a `systemd` timer or a `cron` entry), not by keeping a Node process alive.

- **`npm start`** (or `npm run dev` without building first) runs one full cycle of CLAUDE.md steps 2 → 5: RSS/Atom ingestion, scrape-fallback ingestion, the MDX writer, then the Telegram digest. Prints a run summary (sources polled/skipped/errored, items fetched/enqueued/written, notified count).
- **`npm run poll:events:once`** runs step 6 (Luma iCal + PuneTech RSS) on its own — it's the lowest-priority, lowest-cadence vertical and isn't part of the main cycle.

Each source only actually fetches once its own documented cadence has elapsed since its last poll (tracked in SQLite, see `src/ingest/pipeline.ts`'s `isDueForPoll`) — so it's safe to invoke `npm start` as often as the *fastest* active source needs, and slower/"be courteous" sources (arXiv, GitHub per-repo releases, …) simply no-op on the runs they're not due for, no separate cron entry per cadence tier required.

Recommended schedule:

| Scheduler entry | Command | Interval | Why |
|---|---|---|---|
| Main cycle | `npm start` | every 5–10 min | Matches the fastest active sources (Techmeme ~5 min, TechCrunch ~10–15 min); everything slower self-skips until due. |
| Events | `npm run poll:events:once` | once daily | Luma/PuneTech are both documented as daily-cadence, hand-curated-adjacent sources. |

A `crontab` example:

```cron
*/10 * * * * cd /path/to/bytefisk-news-scrapper && npm start >> logs/run.log 2>&1
0 6 * * *    cd /path/to/bytefisk-news-scrapper && npm run poll:events:once >> logs/events.log 2>&1
```

### Cadence by source (for reference)

Pulled straight from `src/config/sources.ts` (itself pulled from `TECH_NEWS_SOURCE_MAP.md`) — not re-derived here, so if a source's cadence changes, update it there and this table is just a summary of the same data.

| Cadence | Sources |
|---|---|
| 5–15 min | Techmeme, TechCrunch, YourStory, ET Tech, Moneycontrol, Bloomberg Technology, The Verge, HN Algolia |
| 30 min | LiveMint Technology, Business Standard Tech, OpenAI, MediaNama, TechCrunch Gov & Policy |
| ~1 hour | Google AI Blog, Microsoft, AWS, Apple Newsroom, NVIDIA, Samsung, Intel IR, AMD IR, the Google-News-proxied company feeds (xAI/IBM/Oracle/Salesforce/Tesla), Anthropic news, Meta newsroom |
| A few times/day | GitHub Trending |
| Every 6 h / daily | arXiv API |
| Daily | arXiv RSS, Semantic Scholar, GitHub per-repo releases watch-list, Luma, PuneTech |

## Available commands

| Command | What it does |
|---|---|
| `npm start` / `npm run dev` | Full step 2→5 cycle (see above). `dev` runs TypeScript directly via `tsx`; `start` runs the built `dist/`. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Full `node:test` suite (unit + integration tests against local fixtures/mock servers — no live network). |
| `npm run check` | A small, dependency-free sanity check (no test framework, no fixtures) for the two things most likely to silently corrupt output if broken: the dedupe round-trip and the category-mapping table. Fast enough to run before every deploy. |
| `npm run poll:news:once` | Step 2 alone (RSS/Atom ingestion). |
| `npm run poll:scrape:once` | Step 3 alone (GitHub Trending / Anthropic news / Meta newsroom scrapers). |
| `npm run poll:events:once` | Step 6 alone (Luma iCal + PuneTech RSS). |
| `npm run write:mdx` | Step 4 alone (write every `pending` row out as MDX). |
| `npm run notify` | Step 5 alone (send the Telegram digest for every `written` row). |

## Output schema

News items → `src/content/news/<slug>.mdx`; events → `src/content/events/<slug>.mdx`. See [`CLAUDE.md`](./CLAUDE.md#output-schema) for the authoritative frontmatter schema. News `category` is assigned from an explicit, reviewable table keyed by each source's `TECH_NEWS_SOURCE_MAP.md` section number — see `src/write/classify.ts` — not guessed per-item from free text.

## Status

Steps 2–6 of CLAUDE.md's scope are built (RSS/Atom ingestion, scrape-fallback ingestion, the dedupe + MDX writer, the Telegram digest notifier, and events ingestion). Step 7 (Tracxn/Crunchbase funding ingestion) is intentionally not built — no paid key is provisioned; see `src/funding/checkFundingConfig.ts` and `.env.example`.
