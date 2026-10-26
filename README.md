# Bytefisk News Scrapper

24/7 tech-news monitor for [Bytefisk](https://github.com/saksham-shr/bytefisk) — India-focused tech/startup news plus global tech, funding, GitHub Trending, Product Hunt, research papers, policy, and events. Polls verified open sources on a schedule, dedupes, and pushes new items into Bytefisk's `src/content/news` and `src/content/events` MDX collections.

## What this is

A standalone scraper/ingestion service, separate from the Bytefisk public site repo. It does not render any pages — it only produces `.mdx` files (and optionally notifies via Telegram) that get committed into the Bytefisk content repo.

See [`TECH_NEWS_SOURCE_MAP.md`](./TECH_NEWS_SOURCE_MAP.md) for the full researched list of sources, endpoints, auth requirements, and polling cadence.

See [`CLAUDE.md`](./CLAUDE.md) for the build spec (tech stack, output schema, scope) for an automated/cloud build session.

## Status

Not yet built. Scaffolding only.
