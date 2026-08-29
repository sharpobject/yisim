#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const codec = require("./recording-codec.cjs");

const dataRoot = path.resolve(process.argv[2] ?? "");
const payloadCacheRoot = path.resolve(process.argv[3] ?? "");
const oldDataRoot = process.argv[4] ? path.resolve(process.argv[4]) : null;

if (!dataRoot || !payloadCacheRoot) {
  throw new Error("usage: verify_recording_format.mjs DATA_ROOT PAYLOAD_CACHE_ROOT [OLD_DATA_ROOT]");
}

function readGzipJson(filename) {
  const compressed = fs.readFileSync(filename);
  assert.equal(compressed[0], 0x1f, `${filename} is not gzip data`);
  assert.equal(compressed[1], 0x8b, `${filename} is not gzip data`);
  return JSON.parse(gunzipSync(compressed));
}

function readAssignedJson(filename, prefix) {
  const source = fs.readFileSync(filename, "utf8").trim();
  assert.ok(source.startsWith(prefix), `${filename} has an unexpected assignment`);
  return JSON.parse(source.slice(prefix.length).replace(/;\s*$/, ""));
}

function emptyCatalog() {
  return Object.fromEntries(codec.CATALOG_KINDS.map((kind) => [kind, {}]));
}

function mergeCatalog(target, source, recordingId) {
  for (const kind of codec.CATALOG_KINDS) {
    for (const [id, entry] of Object.entries(source[kind] ?? {})) {
      if (target[kind][id]) {
        assert.deepStrictEqual(target[kind][id], entry,
          `conflicting ${kind} ${id} in expanded recording ${recordingId}`);
      } else {
        target[kind][id] = entry;
      }
    }
  }
}

function comparableCatalogItem(item) {
  const copy = structuredClone(item);
  delete copy.file;
  return copy;
}

const packedCatalogPath = path.join(dataRoot, "catalog.compact.json.gz");
const { sharedCatalog, catalog } = codec.unpackCatalog(readGzipJson(packedCatalogPath));
const ids = new Set();
const expectedFiles = new Set();
const exactSharedCatalog = emptyCatalog();
let packedBytes = fs.statSync(packedCatalogPath).size;
let expandedBytes = 0;

for (const item of catalog) {
  assert.match(item.id, /^r-[0-9a-f]{16}$/, `invalid recording id ${item.id}`);
  assert.ok(!ids.has(item.id), `duplicate catalog recording ${item.id}`);
  ids.add(item.id);
  assert.equal(item.file, `${item.id}.compact.json.gz`, `noncanonical filename for ${item.id}`);
  expectedFiles.add(item.file);

  const payloadPath = path.join(payloadCacheRoot, `${item.id}.compact.json`);
  assert.ok(fs.existsSync(payloadPath), `missing expanded payload ${payloadPath}`);
  const expandedSource = fs.readFileSync(payloadPath, "utf8");
  expandedBytes += Buffer.byteLength(expandedSource);
  const expanded = JSON.parse(expandedSource);
  mergeCatalog(exactSharedCatalog, expanded.catalog, item.id);

  const packedPath = path.join(dataRoot, item.file);
  assert.ok(fs.existsSync(packedPath), `missing packed recording ${packedPath}`);
  packedBytes += fs.statSync(packedPath).size;
  const decoded = codec.unpackRecording(readGzipJson(packedPath), sharedCatalog);
  assert.deepStrictEqual(decoded, expanded, `packed recording changed ${item.id}`);
}

assert.deepStrictEqual(sharedCatalog, exactSharedCatalog,
  "shared catalog is not exactly the union referenced by published recordings");

const actualFiles = fs.readdirSync(dataRoot)
  .filter((name) => name.startsWith("r-") && name.endsWith(".compact.json.gz"));
assert.deepStrictEqual(new Set(actualFiles), expectedFiles,
  "packed recording files and catalog entries differ");
assert.equal(fs.readdirSync(dataRoot).some((name) =>
  name === "catalog.js" || name.endsWith(".compact.js")), false,
"legacy executable recording payloads remain in the output");

let oldCompared = 0;
if (oldDataRoot) {
  const oldCatalog = readAssignedJson(
    path.join(oldDataRoot, "catalog.js"),
    "window.RECORDING_CATALOG = ",
  );
  const newById = new Map(catalog.map((item) => [item.id, item]));
  for (const oldItem of oldCatalog) {
    const newItem = newById.get(oldItem.id);
    assert.ok(newItem, `previously published recording disappeared: ${oldItem.id}`);
    assert.deepStrictEqual(comparableCatalogItem(newItem), comparableCatalogItem(oldItem),
      `selector metadata changed for ${oldItem.id}`);

    const oldPayload = readAssignedJson(
      path.join(oldDataRoot, oldItem.file),
      "window.REPLAY_RECORDING = ",
    );
    const newPayload = codec.unpackRecording(
      readGzipJson(path.join(dataRoot, newItem.file)),
      sharedCatalog,
    );
    assert.deepStrictEqual(newPayload, oldPayload,
      `previously published viewer data changed for ${oldItem.id}`);
    oldCompared += 1;
  }
}

console.log(JSON.stringify({
  recordings: catalog.length,
  previousRecordingsCompared: oldCompared,
  expandedBytes,
  packedBytes,
  reductionPercent: Number((100 * (1 - packedBytes / expandedBytes)).toFixed(2)),
  sharedCatalogEntries: Object.fromEntries(codec.CATALOG_KINDS.map((kind) =>
    [kind, Object.keys(sharedCatalog[kind]).length])),
}));
