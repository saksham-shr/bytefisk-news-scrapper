# Bytefisk News Scrapper — build instructions for Claude

## What this is

24/7 ingestion service that polls verified tech-news sources (see `TECH_NEWS_SOURCE_MAP.md`), dedupes items, and writes them out as MDX files matching Bytefisk's content schema — ready to commit into the [Bytefisk](https://github.com/saksham-shr/bytefisk) site repo's `src/content/news/` and `src/content/events/` directories.

This is a separate repo from the public site. It never renders pages and never talks to a hosted DB — output is plain `.mdx` files plus optional Telegram notification.

## Tech stack

- **Runtime:** Node.js (TypeScript).
- **Scheduling:** cron-style polling, cadence per source as documented in `TECH_NEWS_SOURCE_MAP.md` (ranges from 5 min for Techmeme to daily for arXiv/events).
- **Storage:** SQLite (local file) for dedupe state (seen GUIDs/URLs) and a queue of pending items — no hosted DB, no secrets leave the machine.
- **Parsing:** RSS/Atom via a standard feed parser; a small set of HTML scrapers (GitHub Trending, Anthropic news, Meta newsroom) with version-locked selectors — expect drift, log parse failures loudly rather than silently dropping.
- **Notification:** Telegram Bot API (`@BotFather` token), batched digest per run, respecting rate limits in the source map (§13).
- **Output:** `.mdx` files written to a configurable output path (point it at a local clone of the Bytefisk repo), matching the schema below.

## Output schema

News items → `src/content/news/<slug>.mdx`, frontmatter must satisfy Bytefisk's `news` collection schema:

```yaml
title: string
description: string
date: ISO date
category: Funding | Launches | Industry | Policy | Open Source
draft: boolean (default false)
```

Event items → `src/content/events/<slug>.mdx`, matching the `events` collection schema:

```yaml
title: string
description: string
date: ISO date
type: Conference | Meetup | Hackathon | Workshop
format: Virtual | In-Person
location: string
duration: string
price: string
registerUrl: string (default '#')
ctaLabel: string (default 'Register')
draft: boolean (default false)
```

Body content: short summary + source attribution link, no full-article reproduction (most sources are headline/summary-only per their RSS terms — don't paraphrase around a paywall).

## Scope — build in this order

1. Scaffold: Node + TypeScript project, SQLite dedupe store, config file for source list + cadence.
2. RSS/Atom ingestion for every **open** source in `TECH_NEWS_SOURCE_MAP.md` sections 1, 2, 6 (HN Algolia + OpenAI), 7, 8, 10, 12.
3. Scrape-fallback ingestion for sources explicitly marked **scrape** (GitHub Trending, Anthropic news, Meta newsroom) — version-lock selectors, fail loud on drift.
4. Dedupe + MDX writer matching the schema above.
5. Telegram digest notifier (one message batching new items per run).
6. Events ingestion (Luma iCal primary, PuneTech RSS fallback) — lower priority, weakest/most manual vertical per the source map.
7. Funding-specific structured ingestion (Tracxn/Crunchbase) — only if a paid key is actually provisioned; otherwise skip, rely on India news RSS for funding signal.

## Out of scope — do not build

- No review/approval UI — if moderation is needed later, Bytefisk's own admin panel (tracked in the main repo) is the place for it, not this service.
- No direct write access to a hosted DB or the live site — output is `.mdx` files only; a human (or the Bytefisk admin panel) still commits/pushes to go live.
- No full-article reproduction/scraping past headline+summary for paywalled sources.
- Drop the Reddit RSS tier entirely once Reddit retires `.rss` (13 Nov 2026, per source map §6) — don't build a paid relay workaround.
