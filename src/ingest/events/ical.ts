import ical, { type CalendarComponent, type ParameterValue, type VEvent } from "node-ical";
import type { EventFormat, EventPayloadExtras, EventType } from "../../write/types.js";
import type { RawItem } from "../types.js";

export type EventRawItem = RawItem & EventPayloadExtras;

/** node-ical returns a plain string, or {val, params} when the property had iCal parameters. */
function textOf(value: ParameterValue | undefined): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : value.val ?? "";
}

function formatDuration(start: Date | undefined, end: Date | undefined): string | undefined {
  if (!start || !end) return undefined;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (minutes <= 0) return undefined;

  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return days === 1 ? "1 day" : `${days} days`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${remainder}m`;
}

const HACKATHON_RE = /\bhackathons?\b/i;
const WORKSHOP_RE = /\bworkshops?\b/i;
const CONFERENCE_RE = /\b(conference|summit|expo)\b/i;
const VIRTUAL_RE = /\b(zoom|virtual|online|google meet|meet\.google|webinar|livestream)\b/i;

function classifyEventType(text: string): EventType {
  if (HACKATHON_RE.test(text)) return "Hackathon";
  if (WORKSHOP_RE.test(text)) return "Workshop";
  if (CONFERENCE_RE.test(text)) return "Conference";
  return "Meetup";
}

function classifyFormat(location: string, text: string): EventFormat {
  return location.trim() === "" || VIRTUAL_RE.test(`${location} ${text}`) ? "Virtual" : "In-Person";
}

function isVEvent(component: CalendarComponent): component is VEvent {
  return component.type === "VEVENT";
}

function toEventRawItem(event: VEvent, sourceId: string, fallbackUrl: string): EventRawItem | null {
  const title = textOf(event.summary).trim();
  if (!title) return null;

  const description = textOf(event.description).trim();
  const location = textOf(event.location).trim();
  const eventUrl = (event.url ?? "").trim();
  const uid = (event.uid ?? "").trim();
  // guid is dedupe-only and may be an opaque UID; url/registerUrl must
  // stay an actual dereferenceable link, so they fall back to the
  // calendar's own page rather than to guid when the event has no URL.
  const guid = eventUrl || uid || `${sourceId}:${title}:${event.start?.toISOString() ?? ""}`;
  const url = eventUrl || fallbackUrl;
  const classificationText = `${title} ${description}`;

  return {
    sourceId,
    url,
    guid,
    title,
    summary: description,
    publishedAt: event.start ? event.start.toISOString() : null,
    type: classifyEventType(classificationText),
    format: classifyFormat(location, classificationText),
    location: location || undefined,
    duration: formatDuration(event.start, event.end),
    registerUrl: eventUrl || undefined,
  };
}

/**
 * Parse an already-fetched iCalendar (.ics) feed into EventRawItems using
 * `node-ical` for the actual RFC 5545 parsing (line folding, text
 * escaping, timezone-aware DTSTART/DTEND) rather than a hand-rolled
 * parser. Pure (no network) so it's unit-testable against fixtures.
 *
 * Recurring events (RRULE) are not expanded into per-occurrence items —
 * node-ical surfaces the base VEVENT only; expanding would need
 * `ical.expandRecurringEvent` with an explicit date window, which is out
 * of scope here (every other source in this repo also treats one feed
 * entry as one item, not an infinite/open-ended series).
 *
 * Throws if it finds zero VEVENT components, matching the "fail loud on
 * drift" convention used by the HTML scrapers (src/ingest/scrapers/) —
 * an empty calendar is plausible, but a feed that stopped being valid
 * iCalendar entirely is a drift signal, not silence.
 */
export function parseIcalText(ics: string, sourceId: string, fallbackUrl: string): EventRawItem[] {
  const parsed = ical.sync.parseICS(ics);
  const items: EventRawItem[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || !isVEvent(component)) continue;
    const item = toEventRawItem(component, sourceId, fallbackUrl);
    if (item) items.push(item);
  }

  if (items.length === 0) {
    throw new Error(`${sourceId}: parsed 0 VEVENT components from the iCal feed — feed format likely drifted`);
  }
  return items;
}
