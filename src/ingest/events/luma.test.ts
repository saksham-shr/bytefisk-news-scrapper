import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { fetchLumaEvents } from "./luma.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

async function withLumaServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const icsText = fixture("sample-calendar.ics");
  const server: Server = createServer((req, res) => {
    if (req.url === "/ics/cal-abc123.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      res.end(icsText);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><a href="/ics/cal-abc123.ics">Subscribe (iCal)</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = process.env.LUMA_CALENDAR_URL;
  process.env.LUMA_CALENDAR_URL = `http://127.0.0.1:${address.port}`;
  try {
    await run(process.env.LUMA_CALENDAR_URL);
  } finally {
    process.env.LUMA_CALENDAR_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("fetchLumaEvents discovers the iCal link from the calendar page and parses it", async () => {
  await withLumaServer(async () => {
    const items = await fetchLumaEvents("luma-community-meetups");
    assert.equal(items.length, 2);
    assert.equal(items[0].title, "Bengaluru AI Builders Meetup");
    assert.equal(items[0].format, "In-Person");
    assert.equal(items[1].format, "Virtual");
  });
});

test("fetchLumaEvents throws loudly if the calendar page has no discoverable iCal link", async () => {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body><a href="/about">About</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");

  const previous = process.env.LUMA_CALENDAR_URL;
  process.env.LUMA_CALENDAR_URL = `http://127.0.0.1:${address.port}`;
  try {
    await assert.rejects(() => fetchLumaEvents("luma-community-meetups"), /drifted/);
  } finally {
    process.env.LUMA_CALENDAR_URL = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
