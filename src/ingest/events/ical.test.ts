import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseIcalText } from "./ical.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

const FALLBACK_URL = "https://luma.com/CommunityMeetups";

test("parseIcalText parses VEVENT blocks, unescapes text, and skips titleless events", () => {
  const items = parseIcalText(fixture("sample-calendar.ics"), "luma-community-meetups", FALLBACK_URL);
  assert.equal(items.length, 2, "the titleless third event must be skipped");

  const [first, second] = items;
  assert.equal(first.title, "Bengaluru AI Builders Meetup");
  assert.match(first.summary, /Monthly meetup for AI builders\.\nBring your laptop!/);
  assert.equal(first.location, "WeWork Koramangala, Bengaluru");
  assert.equal(first.url, "https://luma.com/events/bengaluru-ai-builders");
  assert.equal(first.registerUrl, "https://luma.com/events/bengaluru-ai-builders");
  assert.equal(first.publishedAt, "2026-11-01T13:00:00.000Z");
  assert.equal(first.duration, "2 hours");
  assert.equal(first.format, "In-Person");
  assert.equal(first.type, "Meetup");

  assert.equal(second.title, "Virtual Workshop: Intro to MCP");
  assert.equal(second.format, "Virtual", "empty location + 'Zoom' in description should classify as Virtual");
  assert.equal(second.type, "Workshop");
  assert.equal(second.duration, "2 hours");
  assert.equal(second.guid, "event-2@luma.com", "dedupe guid falls back to UID when URL is absent");
  assert.equal(
    second.url,
    FALLBACK_URL,
    "url must fall back to the calendar page, not the opaque UID, when the event has no URL of its own",
  );
  assert.equal(
    second.registerUrl,
    undefined,
    "registerUrl stays unset (not the opaque UID) when there's no real event URL — writer.ts falls back to item.url, i.e. the calendar page, ahead of its own '#' default",
  );
});

test("parseIcalText throws when it finds zero VEVENT blocks (feed drift)", () => {
  assert.throws(
    () => parseIcalText("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n", "luma-community-meetups", FALLBACK_URL),
    /drifted/,
  );
});

test("parseIcalText unfolds RFC 5545 continuation lines", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:folded@example.com",
    "SUMMARY:A title that got",
    //  Two leading spaces: unfolding strips exactly one (RFC 5545's fold
    // marker), and the second is the word-space a real generator must
    // double up to preserve when it happens to fold right at one.
    "  folded across two lines",
    "DTSTART:20261101T120000Z",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const items = parseIcalText(ics, "luma-community-meetups", FALLBACK_URL);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "A title that got folded across two lines");
});

test("parseIcalText treats a conference/hackathon mention as the matching event type", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:a@example.com",
    "SUMMARY:Annual Tech Conference",
    "DTSTART:20261101T120000Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:b@example.com",
    "SUMMARY:Weekend Hackathon",
    "DTSTART:20261101T120000Z",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const items = parseIcalText(ics, "luma-community-meetups", FALLBACK_URL);
  assert.equal(items[0].type, "Conference");
  assert.equal(items[1].type, "Hackathon");
});
