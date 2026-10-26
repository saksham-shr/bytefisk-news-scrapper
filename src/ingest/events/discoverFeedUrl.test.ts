import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverLinkUrl } from "./discoverFeedUrl.js";

const html = `
<html><body>
  <a href="/about">About</a>
  <a href="https://calendar.luma.com/ics/cal-abc123.ics">Subscribe (iCal)</a>
  <a href="/other">Other</a>
</body></html>
`;

test("discoverLinkUrl returns the first href matching a pattern, resolved to absolute", () => {
  const url = discoverLinkUrl(html, "https://luma.com/CommunityMeetups", [/\.ics(\?|$)/i], "iCal subscribe link");
  assert.equal(url, "https://calendar.luma.com/ics/cal-abc123.ics");
});

test("discoverLinkUrl resolves a relative href against the base URL", () => {
  const relative = `<a href="/feed/">Subscribe via RSS</a>`;
  const url = discoverLinkUrl(relative, "https://punetech.com/some-page/", [/feed/i], "RSS feed link");
  assert.equal(url, "https://punetech.com/feed/");
});

test("discoverLinkUrl tries patterns in order and returns the first one that matches anything", () => {
  const url = discoverLinkUrl(html, "https://luma.com/CommunityMeetups", [/nonexistent/i, /\.ics/i], "iCal link");
  assert.equal(url, "https://calendar.luma.com/ics/cal-abc123.ics");
});

test("discoverLinkUrl throws when no link matches any pattern", () => {
  assert.throws(
    () => discoverLinkUrl(html, "https://luma.com/CommunityMeetups", [/nonexistent/i], "iCal subscribe link"),
    /drifted/,
  );
});
