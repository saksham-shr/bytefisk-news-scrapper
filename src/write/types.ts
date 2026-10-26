/** Per CLAUDE.md's output schema for src/content/news/<slug>.mdx. */
export type NewsCategory = "Funding" | "Launches" | "Industry" | "Policy" | "Open Source";

export interface NewsFrontmatter {
  title: string;
  description: string;
  date: string;
  category: NewsCategory;
  draft: boolean;
}

/** Per CLAUDE.md's output schema for src/content/events/<slug>.mdx. */
export type EventType = "Conference" | "Meetup" | "Hackathon" | "Workshop";
export type EventFormat = "Virtual" | "In-Person";

export interface EventFrontmatter {
  title: string;
  description: string;
  date: string;
  type: EventType;
  format: EventFormat;
  location: string;
  duration: string;
  price: string;
  registerUrl: string;
  ctaLabel: string;
  draft: boolean;
}

/**
 * Optional fields an events ingester (issue #5) can attach to a RawItem's
 * payload before enqueuing — the writer falls back to CLAUDE.md's stated
 * defaults for anything missing rather than failing the write.
 */
export interface EventPayloadExtras {
  type?: EventType;
  format?: EventFormat;
  location?: string;
  duration?: string;
  price?: string;
  registerUrl?: string;
}
