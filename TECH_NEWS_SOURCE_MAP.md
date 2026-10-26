# 24/7 tech-news monitor: verified source map

Researched 26 October 2026. **Open** means usable without an account/key; **key** means a signup/token; **paid** means a commercial contract/subscription. "Cadence" is an operational polling recommendation or publisher cadence, not a promise that a source will publish that often. URLs labelled **checked** were opened successfully during research; avoid substituting guessed `/feed` paths.

## 1. India tech, startups, and funding

| Source | Type and exact endpoint | Auth / access | Cadence | Fallback if unavailable |
|---|---|---|---|---|
| YourStory | RSS — <https://yourstory.com/rssFeed> (**checked**; aliases `/RSS` and `/rss.cms` also resolve) | **Open** | Poll 15–30 min | Inc42 home/news pages; ET Tech RSS |
| Inc42 | No public RSS found. Scrape only its public [latest/news page](https://inc42.com/) if its terms permit; paid intelligence is [Datalabs](https://inc42.com/datalabs/). | Public headlines open; some articles/paywall; Datalabs **paid** | Poll 30 min | YourStory RSS; Entrackr public pages |
| Entrackr | No published RSS/API found; public-news **scrape** fallback: <https://entrackr.com/>. | Headlines open; respect robots/terms | Poll 30–60 min | Inc42; YourStory |
| Economic Times Tech | RSS — <https://economictimes.indiatimes.com/tech/rss.cms> (**checked through ET’s official RSS directory**) | **Open**; many articles are ETPrime **paid** | Poll 15 min | ET Technology/AI category feeds in [ET RSS directory](https://economictimes.indiatimes.com/markets/stocks/rss.cms); Business Standard |
| Mint / LiveMint | RSS — <https://www.livemint.com/rss/technology> (**checked**). No public official API. | **Open** feed; some articles subscription-gated | Poll 30 min | Mint companies feed <https://www.livemint.com/rss/companies>; ET Tech |
| Moneycontrol | RSS — <https://www.moneycontrol.com/rss/latestnews.xml> (**checked**); broad business fallback: <https://www.moneycontrol.com/rss/business.xml>. There is no reliably documented technology-only official feed. | **Open** | Poll 15 min | Mint Technology; Business Standard Tech |
| The Ken | No public RSS/API. Its journalism is subscription-led; do **not** treat newsletter/web-page scraping as a stable feed. | **Paid login** for articles | Daily | Inc42; Entrackr; ET Tech |
| Business Standard Tech | RSS — <https://www.business-standard.com/rss/technology.xml> (**checked via its [official RSS directory](https://www.business-standard.com/rss-feeds/listing)**) | **Open** feed; premium articles may be metered | Poll 30 min | Mint Technology; Moneycontrol latest |

Practical primary set: YourStory + ET Tech + Mint Technology + Business Standard Tech, with Inc42/Entrackr as policy-reviewed scrapers only. Feed items are generally headline/summary metadata; a paid article is not made reusable merely because its headline is in RSS.

## 2. Global major technology news

| Source | Type and exact endpoint | Auth / access | Cadence | Fallback |
|---|---|---|---|---|
| TechCrunch | RSS — <https://techcrunch.com/feed/> (**checked**) | **Open**; feed use subject to [RSS terms](https://techcrunch.com/rss-terms-of-use/) | Poll 10–15 min | Techmeme; The Verge |
| Techmeme | RSS — <https://www.techmeme.com/feed.xml> (**checked**) | **Open** | Poll 5–10 min | TechCrunch; Reuters Technology |
| Bloomberg Technology | RSS — <https://www.bloomberg.com/feeds/technology/news.rss> (**checked**; legacy host `feeds.bloomberg.com/technology/news.rss` also redirects/has historically worked) | **Open headlines/excerpts**; full stories often **paid** | Poll 15 min | Reuters; Techmeme |
| The Verge | RSS — <https://www.theverge.com/rss/index.xml> (**checked**) | **Open** | Poll 15 min | TechCrunch; Techmeme |
| Reuters Technology | No current, supported Reuters Technology RSS was found. Historic `feeds.reuters.com/reuters/technologyNews` is retired/unreliable. Use Reuters’ public technology page only as **scrape**: <https://www.reuters.com/technology/>. | Headlines public; commercial/newswire API **paid** | Poll 15 min | Techmeme; Bloomberg Technology RSS |

## 3. Funding-specific structured data

| Provider | Exact API / India-filter method | Auth and price | India coverage / caveat | Fallback |
|---|---|---|---|---|
| Crunchbase | `POST https://api.crunchbase.com/v4/data/searches/funding_rounds` with `X-cb-user-key`; request fields such as `announced_on`, `funded_organization_identifier`, `money_raised`, then use the documented organization-location predicate/identifier for India. Legacy reference: `POST https://api.crunchbase.com/api/v4/searches/funding_rounds?user_key=…`. **There is no safe one-line `country=IN` URL parameter**: v4 search takes JSON predicates, and the exact location field must be confirmed against the licensed schema. | API access is **paid / sales-provisioned**, not a free developer tier; key required. | Broad global coverage; useful for India but generally less India-specialized than Tracxn/Inc42. | Tracxn; India news RSS + manual entity enrichment |
| PitchBook | Base URL: `https://api.pitchbook.com`. Funding/financing endpoints and field schema are contract documentation, not publicly callable; ask Direct Data for the exact financing search endpoint and an India/country filter. | **Paid standalone API contract** plus key/token; no public free tier or public pricing. | Strong institutional/global private-market coverage; India coverage is not publicly quantified—validate against a sample of known Indian rounds. | Crunchbase; Tracxn |
| Tracxn | **POST** endpoint/path and filter vocabulary are exposed in its authenticated [Postman API workspace](https://www.postman.com/tracxn/workspace/tracxn-api-documentation/overview), using `accessToken` header. Query the Transaction/Funding Rounds API with its `filter` object for country `India`/`IN`, `sort`, `from`, `size` (max 20). Do not assume a public URL such as `/funding-rounds?country=IN`. | Account token required. Lite is free but usage-limited; API/Data Solutions are **paid/custom annual**, trial 5–7 days usually available. | **Best fit for India**: India-founded company and local-funding focus; its pricing page reports 2M+ funding rounds. | Crunchbase; Inc42 Datalabs (paid) |

Public pricing is intentionally not published for Crunchbase API, PitchBook API, or Tracxn API/Data Solutions. Treat quoted web prices for ordinary seats as non-API pricing. References: [Crunchbase API essentials](https://data.crunchbase.com/docs/api-essentials), [PitchBook API](https://pitchbook.com/help/PitchBook-api), [Tracxn pricing](https://tracxn.com/pricing), and [Tracxn API onboarding](https://help.tracxn.com/en/articles/8512359-getting-started-with-tracxn-apis).

## 4. GitHub Trending

GitHub has **no official Trending REST or GraphQL endpoint**. The official Search API can find *recent/high-star* repositories but cannot reproduce GitHub’s period-star Trending ranking. The authoritative public HTML is:

`https://github.com/trending?since=daily`  
`https://github.com/trending/<language>?since=weekly`  

`<language>` is a language slug (for example `python`, `typescript`, `c%2B%2B`), not an arbitrary topic. GitHub Trending itself has no topic filter. To find topics such as `ai-agents`, `llm`, or `claude`, filter the fetched repository name/description/topics afterwards, or use official repository search (`GET https://api.github.com/search/repositories?q=topic:ai-agents+created:>=YYYY-MM-DD&sort=stars&order=desc`) as a separate “emerging repos” signal. That endpoint has its normal GitHub API rate limits; a token is advisable.

| Option | Endpoint / repo | Maintenance evidence at research time | Auth | Use |
|---|---|---|---|---|
| Best no-code JSON/RSS wrapper | [isboyjc/github-trending-api](https://github.com/isboyjc/github-trending-api): `https://raw.githubusercontent.com/isboyjc/github-trending-api/main/data/{daily|weekly|monthly}/{language|all}.{json|xml}` | **32 stars; last commit 2026-08-26** (checked 2026-10-26). Actions-generated dataset; less actively maintained, so use with a direct-scrape fallback. | **Open** | Primary convenience source; supports language/timeframe only. |
| Transparent snapshot dataset | [host452b/trending-on-github](https://github.com/host452b/trending-on-github) | **0 stars; last commit 2026-10-26** (checked 2026-10-26). Daily cron at 00:30 UTC, versioned JSON snapshots. | **Open** | Backfill/audit, not live alerting. |
| Self-hosted parser reference | [OpenCLI GitHub Trending adapter](https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/github-trending.md) | **30,663 stars; last commit 2026-10-26** (checked 2026-10-26). Explicitly parses the server-rendered public page. | **Open** | Best-maintained parser reference; version-lock and test for page changes. |

Recommended fallback: fetch the public Trending HTML at most a few times per day, parse repository cards, and retain the raw response plus timestamp. It is a **scrape**, so expect parser drift, rate limiting, and terms/robots review. A stable alternative is GitHub’s official search API with `topic:`, `language:`, `created:`, and `pushed:` qualifiers, clearly labelled “emerging,” not “Trending.”

## 5. Product Hunt

| Source | Type and exact endpoint | Auth / free tier | Cadence | Fallback |
|---|---|---|---|---|
| Product Hunt API v2 | GraphQL `POST https://api.producthunt.com/v2/api/graphql` | **Free developer access, signup/token required**; public/read-only scope is default. Non-commercial by default; contact Product Hunt for commercial use. | Daily (daily leaderboard); weekly roll-up | Product Hunt web-page scrape only if API access fails; Techmeme/Product Hunt coverage |

Setup: create an OAuth application at <https://www.producthunt.com/v2/oauth/applications>, obtain a client-only token (public reads) or OAuth user token, then send `Authorization: Bearer TOKEN`. Documented limits are **6,250 GraphQL complexity points per 15 min** (and 450 requests/15 min for non-GraphQL v2 endpoints).

The schema’s `posts` connection supports date-window ordering. Query daily posts with an ISO start/end range and order by votes, e.g. `posts(first: 50, postedAfter: "2026-10-25T00:00:00Z", postedBefore: "2026-10-26T00:00:00Z", order: VOTES)` requesting `name, tagline, url, votesCount, createdAt, topics`. For weekly top posts, use the week’s `postedAfter`/`postedBefore` range. Validate exact enum/argument spelling in the authenticated GraphiQL schema because Product Hunt evolves it. Official [API docs](https://www.producthunt.com/v2/docs) and [rate-limit docs](https://api.producthunt.com/v2/docs/rate_limits/headers).

## 6. AI coding agents and agent-skill ecosystem

| Source | Type and exact endpoint/query | Auth | Cadence | Fallback |
|---|---|---|---|---|
| Hacker News Algolia | API — `https://hn.algolia.com/api/v1/search_by_date?query=%22Claude%20Code%22&tags=story&hitsPerPage=100`; substitute `Codex`, `Cursor`, `MCP`, `model%20context%20protocol`, `agent%20skills`, `AI%20agent`; use `numericFilters=points%3E10` or `created_at_i>UNIX_TS` as needed. | **Open** | Poll 15–30 min | HN official Firebase API; Techmeme |
| r/ClaudeAI | RSS — <https://www.reddit.com/r/ClaudeAI.rss> (**checked**) | **Open today**, but Reddit has announced public RSS retirement for 13 Nov 2026—design an API/alternative contingency. | Poll 30–60 min | HN queries; Anthropic news page |
| r/LocalLLaMA | RSS — <https://www.reddit.com/r/LocalLLaMA.rss> | Same RSS caveat | Poll 30–60 min | HN; Hugging Face Papers |
| r/singularity | RSS — <https://www.reddit.com/r/singularity.rss> | Same RSS caveat | Poll 30–60 min | HN; Techmeme |
| Anthropic | No official RSS. Public **scrape** fallback: <https://www.anthropic.com/news>; product release notes: <https://docs.anthropic.com/en/release-notes/overview>. | **Open** pages | Poll 1–4 h | HN `Anthropic`/`Claude Code`; Techmeme |
| OpenAI | RSS — <https://openai.com/news/rss.xml> | **Open** | Poll 30–60 min | <https://openai.com/news>; HN `OpenAI OR Codex` |
| GitHub ecosystem | Trending scrape/wrapper from section 4 plus GitHub search topic queries: `topic:ai-agents`, `topic:llm`, `topic:model-context-protocol`, `claude-code in:name,description,readme`. | Trending open; Search works unauthenticated at low rate, token recommended | Daily / 6 h for search | HN; Product Hunt |
| X/Twitter lists | X API / authenticated web lists only; no durable, login-free official RSS or search source. | **Hard to automate**: API access/login and plan restrictions | N/A | HN, Techmeme, official blogs, GitHub |

HN Algolia’s endpoint is public and supports `search` (relevance) and `search_by_date` (recency); use `tags=story` for submissions, `tags=comment` only when discussion signal is desired. Official docs: <https://hn.algolia.com/api>.

## 7. Official news from major technology companies

| Company | Type and exact source | Auth | Cadence | Fallback |
|---|---|---|---|---|
| OpenAI | RSS — <https://openai.com/news/rss.xml> | **Open** | 30–60 min | Techmeme; HN `OpenAI` |
| Anthropic | **No RSS**; scrape <https://www.anthropic.com/news> and monitor <https://docs.anthropic.com/en/release-notes/overview> | **Open** | 1–4 h | Techmeme; HN `Anthropic` |
| Google | RSS — <https://blog.google/technology/ai/rss/>; broader Google Blog has category feeds | **Open** | 1 h | Google DeepMind RSS <https://deepmind.google/blog/rss.xml>; Techmeme |
| Microsoft | RSS — <https://blogs.microsoft.com/feed/> | **Open** | 1 h | Microsoft AI Blog/News pages; Techmeme |
| Meta | **No official RSS**; scrape <https://about.fb.com/news/> | **Open** | 1–4 h | Techmeme; HN `Meta` |
| Amazon | Corporate newsroom has **no RSS**; weekly newsletter at <https://www.aboutamazon.com/subscribe>. For tech launches use AWS official RSS: <https://aws.amazon.com/blogs/aws/feed/> | Newsletter signup / RSS open | 1 h AWS; weekly corporate | Techmeme; HN `Amazon`/`AWS` |
| Apple | RSS — <https://www.apple.com/newsroom/rss/newsroom.rss> (linked from Apple’s [RSS page](https://www.apple.com/rss/)) | **Open** | 1 h | Apple Newsroom scrape <https://www.apple.com/newsroom/>; Techmeme |
| NVIDIA | RSS — <https://blogs.nvidia.com/feed/> | **Open** | 1 h | NVIDIA blog scrape <https://blogs.nvidia.com/>; Techmeme |
| Samsung | RSS — <https://news.samsung.com/global/feed> (**checked**; valid RSS 2.0, confirmed live items — note: Global Newsroom mixes all product lines, not just tech/mobile, filter by category/tag in ingestion) | **Open** | 1–4 h | Samsung Newsroom scrape; Techmeme |
| Intel | Official `newsroom.intel.com/feed` is **dead** (301 redirect to a 404 redirector, checked). Use investor-relations feed instead: RSS — <https://www.intc.com/news-events/press-releases/rss> (**checked**; valid RSS 2.0, confirmed live items — skews toward earnings/corporate releases over product news) | **Open** | 1–4 h | Techmeme; HN `Intel` |
| AMD | RSS — <https://ir.amd.com/rss/news-releases.xml> (**checked**; valid RSS 2.0, confirmed live items, same IR-skew caveat as Intel) | **Open** | 1–4 h | Techmeme; HN `AMD` |
| xAI | No official RSS found; `x.ai/blog/rss.xml` returns **HTTP 403**. Use Google News RSS query as scrape-equivalent fallback: <https://news.google.com/rss/search?q=%22xAI%22+OR+Grok+when:1d&hl=en-US&gl=US&ceid=US:en> (**checked**; valid RSS 2.0, returns live items) | Open (Google News proxy) | 1–4 h | Techmeme; HN `xAI`/`Grok` |
| IBM / Oracle / Salesforce / Tesla | No confirmed official press-release RSS for any of these four. Same Google News RSS query pattern as xAI above, swapping the keyword (e.g. `q=%22Oracle%22+when:1d`) — **checked** the pattern works (valid RSS, returns live items for live queries) | Open (Google News proxy) | 1–4 h | Techmeme; company HN search |

## 8. Research papers: AI/ML and coding agents

| Source | Type / exact endpoint | Auth | Cadence | Fallback |
|---|---|---|---|---|
| arXiv | Atom API — `http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&start=0&max_results=100`; CS/CL: replace with `cat:cs.CL`; combined: `search_query=cat:cs.AI+OR+cat:cs.CL`. Optional terms: `AND+all:%22code%20agent%22`. | **Open** | Poll daily / every 6 h | Semantic Scholar; HF Papers |
| arXiv RSS | <https://export.arxiv.org/rss/cs.AI> and <https://export.arxiv.org/rss/cs.CL> | **Open** | Daily | arXiv API |
| Papers with Code | Community/product successor, not a dependable official stable API at present. Website/feed: <https://paperswithcode.com/>; treat it as **scrape/best effort**, and do not make it your sole input. | Open web; instability reported | Daily | Hugging Face Papers; arXiv |
| Hugging Face Papers | Daily/trending page — <https://huggingface.co/papers>; structured access through `huggingface_hub` Papers interface (token may be required by service changes). No official RSS located. | Public web; account/token may be needed for API/CLI evolution | Daily | arXiv API; Semantic Scholar |
| Semantic Scholar | Academic Graph API — `GET https://api.semanticscholar.org/graph/v1/paper/search?query=coding%20agents&limit=100&fields=title,abstract,year,publicationDate,url,citationCount,authors` | Most endpoints **open**; API key optional/recommended (`x-api-key`) | Daily | arXiv |

arXiv’s official API docs specify `search_query`, `start`, `max_results`, `sortBy`, and `sortOrder`; be courteous (cache, identify your client, and do not high-frequency poll a daily corpus). Semantic Scholar says unauthenticated traffic uses a shared pool and an API key is free but initially 1 RPS; build 429 backoff. References: [arXiv API manual](https://info.arxiv.org/help/api/user-manual.html), [Semantic Scholar API](https://www.semanticscholar.org/product/api), and [HF Papers CLI](https://huggingface.co/docs/huggingface_hub/guides/cli).

## 10. Policy and regulation (India + global)

| Source | Type and exact endpoint | Auth / access | Cadence | Fallback |
|---|---|---|---|---|
| MediaNama | RSS — <https://www.medianama.com/feed/> (**checked**; returns valid RSS 2.0, confirmed live items) | **Open** feed; some analysis paywalled | Poll 30–60 min | TechCrunch Government & Policy RSS; PIB (scrape) |
| TechCrunch Government & Policy | RSS — <https://techcrunch.com/category/government-policy/feed/> (**checked**; valid RSS 2.0) | **Open** | Poll 30 min | MediaNama; Reuters Technology scrape |
| PIB (Press Information Bureau, India) | RSS directory at <https://www.pib.gov.in/ViewRss.aspx> lists per-ministry feeds (`RssMain.aspx?ModId=6` press releases, pick MeitY's `Regid`). **Direct fetch returned HTTP 403** during this research — bot-blocked; verify from a browser session or use as manual/scrape source, not an automated poll target. | Open in-browser; blocked for direct automated fetch at research time | Daily, manual check | MediaNama; Entrackr/Inc42 policy tags |

No single confirmed India-government RSS source is safely pollable headless (PIB 403'd; MeitY has no confirmed official feed). MediaNama + TechCrunch Government & Policy cover the beat without needing government sources directly.

## 11. Events (for `/events`)

| Source | Type and exact endpoint | Auth / access | Cadence | Fallback |
|---|---|---|---|---|
| Luma — India tech/community meetups | Public calendar <https://luma.com/CommunityMeetups> supports a subscribable iCal feed (per-calendar "Subscribe" link on the page; exact token/URL must be grabbed from that calendar's page, not guessed) | **Open** (public calendar), iCal subscribe | Poll daily | PuneTech RSS; manual curation |
| PuneTech Events Calendar | RSS feed linked from <https://punetech.com/dont-miss-tech-events-subscribe-to-the-punetech-calendar/> (Pune-only, not pan-India) | **Open** | Poll daily | 10times/AllEvents (scrape only, no confirmed API/RSS) |
| 10times / AllEvents.in (India tech category pages) | No confirmed public API or RSS; city/category pages only, e.g. <https://allevents.in/bangalore/technology> — **scrape**, respect robots/terms | Open web, scrape only | Weekly | Manual entry via admin panel |

Weakest vertical in this map: no single pan-India tech-events feed exists. Practical plan is Luma iCal as primary signal plus manual entry through the local admin panel for anything Luma misses — this vertical will stay partly hand-curated, which fits the single-user local-admin design already set in BUILD.md.

## 12. Open-source release tracking

| Source | Type and exact endpoint | Auth / access | Cadence | Fallback |
|---|---|---|---|---|
| GitHub per-repo releases | Atom — `https://github.com/<owner>/<repo>/releases.atom` (confirmed pattern; holds ~10 most recent published, non-draft releases) | **Open** | Poll per-repo daily, or on a watch-list of major langs/frameworks | GitHub Trending (section 4) for emergent repos not yet on a watch-list |

Needs a maintained watch-list of repos (e.g. node, python, rust-lang/rust, torvalds/linux, major frameworks) to point `.atom` at — GitHub has no cross-repo "all releases" feed.

## Reddit RSS retirement — contingency decision

Reddit's `.rss` endpoints (used in section 6 for r/ClaudeAI, r/LocalLLaMA, r/singularity) are confirmed shutting down **13 Nov 2026**, ~2.5 weeks after this research date. No official login-free replacement exists; third-party relays (Apify actor, self-hosted `reddit-rss` Docker proxy) require either paid usage or a Reddit API key, which Reddit is also closing to new registrations. **Decision: drop the Reddit tier at the Nov 13 cutoff rather than pay for a relay** — HN Algolia `search_by_date` (already primary for this section) plus GitHub ecosystem search already cover the same signal (new agent/MCP/tool launches) without the dependency risk.

## 13. Notification delivery

Telegram Bot API is **free** to create/use for a personal monitoring bot; it requires a bot token from `@BotFather` and the recipient must have initiated/contacted the bot (or added it to a group/channel). There is no published monthly message quota for ordinary personal use, but it is **not unlimited throughput**:

- Keep to roughly **1 message/second per private chat** (short bursts may work).
- Keep to **20 messages/minute per group**.
- Keep normal broadcasts below roughly **30 messages/second**; beyond that Telegram returns HTTP 429.
- Paid Broadcasts can reach 1,000 messages/second, charged at 0.1 Telegram Stars per message above the free broadcast allowance, and have eligibility/balance requirements.

For one personal chat, batch links into one digest and retry on `retry_after`; this stays free and comfortably inside practical limits. Official [Bot FAQ](https://core.telegram.org/bots/faq) and [Bot API](https://core.telegram.org/bots/api).

## Consolidated build table

| Topic | Primary source | Backup source | Auth needed | Update frequency |
|---|---|---|---|---|
| India startups/funding news | YourStory RSS | ET Tech RSS; Mint Tech RSS | Open | 15–30 min |
| Global major tech | Techmeme RSS | TechCrunch RSS; Bloomberg Tech RSS | Open (Bloomberg full text may be paid) | 5–15 min |
| Structured funding | Tracxn Transaction API | Crunchbase API; PitchBook | Paid token/contract (Tracxn Lite is not full API) | Daily / 1–4 h |
| GitHub Trending | GitHub Trending HTML / isboyjc wrapper | GitHub Search API | Open scrape; token recommended for search | Daily (or 6 h) |
| Product launches | Product Hunt GraphQL | Product Hunt page scrape | Free signup/token; commercial permission required | Daily |
| Coding-agent ecosystem | HN Algolia `search_by_date` | Reddit RSS (temporary); GitHub Trending | Open; Reddit RSS retirement risk | 15–60 min |
| Official company news | Official RSS feeds (OpenAI/Google/Microsoft/Apple/NVIDIA) | Techmeme; HN company search | Mostly open; Anthropic/Meta scrape | 30 min–4 h |
| AI/ML papers | arXiv API/RSS | Semantic Scholar; HF Papers | Open; S2 key optional | Daily / 6 h |
| Policy / regulation | MediaNama RSS | TechCrunch Government & Policy RSS | Open | 30–60 min |
| Events | Luma CommunityMeetups iCal | PuneTech RSS; manual admin entry | Open; events stay partly hand-curated | Daily |
| Open-source releases | GitHub per-repo `.atom` (watch-list) | GitHub Trending (section 4) | Open | Daily |
| Notifications | Telegram Bot API | Email/webhook service | Free bot token | Immediate; obey per-chat/broadcast limits |

