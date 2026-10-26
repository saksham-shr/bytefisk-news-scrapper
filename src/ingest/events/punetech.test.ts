import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { fetchPunetechEvents } from "./punetech.js";

const RSS_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PuneTech Events</title>
    <item>
      <title>Pune Tech Meetup: Intro to Agents</title>
      <link>https://punetech.com/events/intro-to-agents</link>
      <guid>https://punetech.com/events/intro-to-agents</guid>
      <pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate>
      <description>A beginner-friendly meetup on AI agents.</description>
    </item>
  </channel>
</rss>`;

async function withPunetechServer(run: () => Promise<void>): Promise<void> {
  const server: Server = createServer((req, res) => {
    if (req.url === "/calendar.xml") {
      res.writeHead(200, { "Content-Type": "application/rss+xml" });
      res.end(RSS_FEED_XML);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><a href="/calendar.xml">Subscribe via RSS feed</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = process.env.PUNETECH_SUBSCRIBE_PAGE_URL;
  process.env.PUNETECH_SUBSCRIBE_PAGE_URL = `http://127.0.0.1:${address.port}/subscribe`;
  try {
    await run();
  } finally {
    process.env.PUNETECH_SUBSCRIBE_PAGE_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("fetchPunetechEvents discovers the RSS link from the subscribe page and parses it", async () => {
  await withPunetechServer(async () => {
    const items = await fetchPunetechEvents("punetech-events");
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Pune Tech Meetup: Intro to Agents");
    assert.equal(items[0].url, "https://punetech.com/events/intro-to-agents");
  });
});

test("fetchPunetechEvents throws loudly if the subscribe page has no discoverable feed link", async () => {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><a href="/about">About</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = process.env.PUNETECH_SUBSCRIBE_PAGE_URL;
  process.env.PUNETECH_SUBSCRIBE_PAGE_URL = `http://127.0.0.1:${address.port}/subscribe`;
  try {
    await assert.rejects(() => fetchPunetechEvents("punetech-events"), /drifted/);
  } finally {
    process.env.PUNETECH_SUBSCRIBE_PAGE_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
