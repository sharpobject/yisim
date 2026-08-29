import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const codec = require("./recording-codec.cjs");

export function readPackedJson(filename) {
  return JSON.parse(gunzipSync(fs.readFileSync(filename)));
}

export function readRecordingCatalog(dataRoot) {
  return codec.unpackCatalog(readPackedJson(path.join(dataRoot, "catalog.compact.json.gz")));
}

export function readPackedRecording(filename, sharedCatalog) {
  return codec.unpackRecording(readPackedJson(filename), sharedCatalog);
}

export function recordingFiles(dataRoot) {
  return fs.readdirSync(dataRoot)
    .filter((name) => name.startsWith("r-") && name.endsWith(".compact.json.gz"))
    .sort();
}
