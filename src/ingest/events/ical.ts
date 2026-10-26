import type { EventFormat, EventPayloadExtras, EventType } from "../../write/types.js";
import type { RawItem } from "../types.js";

export type EventRawItem = RawItem & EventPayloadExtras;

type VEvent = Record<string, string>;

/** RFC 5545 line unfolding: a line starting with a space/tab continues the previous line. */
function unfoldLines(ics: string): string[] {
  const rawLines = ics.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeIcalText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

/** "DTSTART;TZID=Asia/Kolkata:20261101T180000" -> { name: "DTSTART", value: "20261101T180000" } */
function parseProperty(line: string): { name: string; value: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return { name: line, value: "" };
  const name = line.slice(0, colonIndex).split(";")[0].toUpperCase();
  const value = line.slice(colonIndex + 1);
  return { name, value };
}

/**
 * Parses a DTSTART/DTEND-style value into an ISO string. TZID params are
 * ignored and any date-time without an explicit "Z" is treated as
 * already UTC — a known simplification (no timezone database here), fine
 * for display/sort purposes but not exact for non-UTC calendars.
 */
function parseIcalDate(value: string): string | null {
  const trimmed = value.trim();
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(trimmed);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`;
  }
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo}-${d}T00:00:00.000Z`;
  }
  return null;
}

function formatDuration(startIso: string | null, endIso: string | null): string | undefined {
  if (!startIso || !endIso) return undefined;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;

  const minutes = Math.round((end - start) / 60_000);
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

function toEventRawItem(event: VEvent, sourceId: string, fallbackUrl: string): EventRawItem | null {
  const title = unescapeIcalText(event.SUMMARY ?? "").trim();
  if (!title) return null;

  const description = unescapeIcalText(event.DESCRIPTION ?? "").trim();
  const location = unescapeIcalText(event.LOCATION ?? "").trim();
  const eventUrl = (event.URL ?? "").trim();
  const uid = (event.UID ?? "").trim();
  // guid is dedupe-only and may be an opaque UID; url/registerUrl must
  // stay an actual dereferenceable link, so they fall back to the
  // calendar's own page rather than to guid when the event has no URL.
  const guid = eventUrl || uid || `${sourceId}:${title}:${event.DTSTART ?? ""}`;
  const url = eventUrl || fallbackUrl;

  const startIso = event.DTSTART ? parseIcalDate(event.DTSTART) : null;
  const endIso = event.DTEND ? parseIcalDate(event.DTEND) : null;
  const classificationText = `${title} ${description}`;

  return {
    sourceId,
    url,
    guid,
    title,
    summary: description,
    publishedAt: startIso,
    type: classifyEventType(classificationText),
    format: classifyFormat(location, classificationText),
    location: location || undefined,
    duration: formatDuration(startIso, endIso),
    registerUrl: eventUrl || undefined,
  };
}

/**
 * Parse an already-fetched iCalendar (.ics) feed's VEVENT blocks into
 * EventRawItems. Pure (no network) so it's unit-testable against
 * fixtures. Throws if it finds zero events, per the same "fail loud on
 * drift" convention as the HTML scrapers (src/ingest/scrapers/) — an
 * empty calendar is plausible but a feed that stopped being valid
 * iCalendar entirely is a drift signal, not silence.
 *
 * `fallbackUrl` (the calendar's own page) is used as an event's `url`
 * when it has no VEVENT `URL` property of its own — never its UID,
 * which is an opaque dedupe token, not a link anyone can open.
 */
export function parseIcalText(ics: string, sourceId: string, fallbackUrl: string): EventRawItem[] {
  const lines = unfoldLines(ics);
  const items: EventRawItem[] = [];
  let current: VEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const item = toEventRawItem(current, sourceId, fallbackUrl);
        if (item) items.push(item);
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const { name, value } = parseProperty(line);
    current[name] = value;
  }

  if (items.length === 0) {
    throw new Error(`${sourceId}: parsed 0 VEVENT blocks from the iCal feed — feed format likely drifted`);
  }
  return items;
}
