#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { gunzipSync, gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const codec = require("./recording-codec.cjs");

const [sourceArg, outputArg, oldRepoArg] = process.argv.slice(2);
if (!sourceArg || !outputArg || !oldRepoArg) {
  throw new Error("usage: prepare_format_migration.mjs SOURCE_DATA OUTPUT_DATA OLD_WIKI_REPO");
}
const sourceRoot = path.resolve(sourceArg);
const outputRoot = path.resolve(outputArg);
const oldRepo = path.resolve(oldRepoArg);

const readGzipJson = (filename) => JSON.parse(gunzipSync(fs.readFileSync(filename)));
const packedCatalog = readGzipJson(path.join(sourceRoot, "catalog.compact.json.gz"));
const { sharedCatalog, catalog } = codec.unpackCatalog(packedCatalog);
const oldCatalogSource = execFileSync("git", [
  "-C", oldRepo, "show", "HEAD:assets/recordings/data/catalog.js",
], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const oldCatalog = JSON.parse(oldCatalogSource
  .replace(/^window\.RECORDING_CATALOG = /, "").replace(/;\s*$/, ""));
const oldIds = new Set(oldCatalog.map((item) => item.id));
const selected = catalog.filter((item) => oldIds.has(item.id));
assert.equal(selected.length, oldCatalog.length, "not every deployed recording exists in the new build");

const normalizeItem = (item) => {
  const copy = structuredClone(item);
  delete copy.file;
  return copy;
};
assert.deepStrictEqual(selected.map(normalizeItem), oldCatalog.map(normalizeItem),
  "recording selector content or order changed during format migration");

const referenced = Object.fromEntries(codec.CATALOG_KINDS.map((kind) => [kind, new Set()]));
for (const item of selected) {
  const packed = readGzipJson(path.join(sourceRoot, item.file));
  assert.equal(packed[0], codec.FORMAT_VERSION, `unsupported recording ${item.id}`);
  for (const [kindIndex, kind] of codec.CATALOG_KINDS.entries()) {
    for (const id of packed[1][kindIndex]) referenced[kind].add(String(id));
  }
}
const exactSharedCatalog = Object.fromEntries(codec.CATALOG_KINDS.map((kind) => [kind,
  Object.fromEntries([...referenced[kind]].map((id) => {
    assert.ok(sharedCatalog[kind][id], `missing shared ${kind} ${id}`);
    return [id, sharedCatalog[kind][id]];
  })),
]));

fs.mkdirSync(outputRoot, { recursive: true });
for (const filename of fs.readdirSync(outputRoot)) fs.rmSync(path.join(outputRoot, filename));
for (const item of selected) {
  fs.copyFileSync(path.join(sourceRoot, item.file), path.join(outputRoot, item.file));
  codec.unpackRecording(readGzipJson(path.join(outputRoot, item.file)), exactSharedCatalog);
}
fs.writeFileSync(path.join(outputRoot, "catalog.compact.json.gz"), gzipSync(Buffer.from(JSON.stringify(
  codec.packCatalog(exactSharedCatalog, selected),
)), { level: 9 }));

console.log(JSON.stringify({
  recordings: selected.length,
  bytes: fs.readdirSync(outputRoot).reduce((sum, name) => sum + fs.statSync(path.join(outputRoot, name)).size, 0),
  sharedCatalogEntries: Object.fromEntries(codec.CATALOG_KINDS.map((kind) =>
    [kind, Object.keys(exactSharedCatalog[kind]).length])),
}));
