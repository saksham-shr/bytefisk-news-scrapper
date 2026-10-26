#!/usr/bin/env node
// `node --test`'s own recursive *.test.ts discovery only works on Node 22+
// (older Node only auto-discovers .js/.cjs/.mjs), but this repo's engines
// field allows Node >=20. Walk the tree ourselves and pass an explicit file
// list instead, so `npm test` behaves the same on every supported Node.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function findTestFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (entry.endsWith(".test.ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = findTestFiles("src");
if (files.length === 0) {
  console.error("No *.test.ts files found under src/");
  process.exit(1);
}

const result = spawnSync("node", ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
