import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { fetchFeeds } from "./feedParser.js";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
}

async function withServer(
  handler: (path: string) => { status: number; body: string },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server: Server = createServer((req, res) => {
    const { status, body } = handler(req.url ?? "/");
    res.writeHead(status, { "Content-Type": "application/xml" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP address");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("fetchFeeds tolerates one bad URL among several and still returns the good ones", async () => {
  const goodXml = fixture("sample-rss.xml");
  await withServer(
    (path) => (path === "/good" ? { status: 200, body: goodXml } : { status: 500, body: "boom" }),
    async (base) => {
      const items = await fetchFeeds([`${base}/good`, `${base}/bad`], "multi-url-source");
      assert.equal(items.length, 2, "items from the good URL should still come through");
    },
  );
});

test("fetchFeeds throws when every URL fails, so the failure is visible to the caller", async () => {
  await withServer(
    () => ({ status: 500, body: "boom" }),
    async (base) => {
      await assert.rejects(() => fetchFeeds([`${base}/a`, `${base}/b`], "all-bad-source"));
    },
  );
});
