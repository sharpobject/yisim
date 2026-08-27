#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { characterInfo, decodeMessage, fateStrategyInfo } from "../scripts/decode_live_observation.mjs";
import { recordingIdsWithAssertions } from "./recording_regressions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rawRoot = path.resolve(process.argv[2] ?? path.join(here, "raw-captures"));
const dataRoot = path.resolve(process.argv[3] ?? path.join(here, "data"));
const wikiRoot = process.env.YXP_WIKI_ROOT || "/private/tmp/yxp_wiki";
const maxCapturedThrough = process.env.YXP_MAX_CAPTURED_THROUGH || "";
const excludedCaptureNames = new Set((process.env.YXP_EXCLUDE_CAPTURES || "")
  .split(",").map((value) => value.trim()).filter(Boolean));
const skipBuildFailures = Boolean(process.env.YXP_SKIP_BUILD_FAILURES);
const catalogOnly = Boolean(process.env.YXP_CATALOG_ONLY);
const forceRebuild = Boolean(process.env.YXP_FORCE_REBUILD);
const incremental = !forceRebuild && process.env.YXP_INCREMENTAL !== "0";
const reuseExisting = incremental || Boolean(process.env.YXP_REUSE_EXISTING);
const scanCacheEnabled = incremental && process.env.YXP_DISABLE_SCAN_CACHE !== "1";
const scanCachePath = path.resolve(process.env.YXP_SCAN_CACHE_PATH
  || path.join(rawRoot, ".recording-browser-build-cache.json"));
const scanCacheVersion = 2;
const buildJobs = Math.max(1, Number.parseInt(process.env.YXP_BUILD_JOBS || "1", 10) || 1);
const regressionRecordingIds = recordingIdsWithAssertions();
const numericPrefix = (value) => Number.parseInt(String(value ?? "0"), 10) || 0;

function publicRecordingId(capture) {
  const digest = createHash("sha256")
    .update(`${capture.targetUid}\0${capture.capturedThrough}`)
    .digest("hex")
    .slice(0, 16);
  return `r-${digest}`;
}

function filesBelow(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(filename) : entry.name.endsWith(".jsonl") ? [filename] : [];
  });
}

function captureFingerprint(filename) {
  const stat = fs.statSync(filename, { bigint: true });
  return { size: stat.size.toString(), mtimeNs: stat.mtimeNs.toString() };
}

function sameFingerprint(first, second) {
  return first?.size === second.size && first?.mtimeNs === second.mtimeNs;
}

function readScanCache() {
  if (!scanCacheEnabled || !fs.existsSync(scanCachePath)) return { entries: {}, warm: false };
  try {
    const cache = JSON.parse(fs.readFileSync(scanCachePath, "utf8"));
    if (cache.version !== scanCacheVersion || cache.rawRoot !== rawRoot || !cache.entries) {
      return { entries: {}, warm: false };
    }
    return { entries: cache.entries, warm: true };
  } catch (error) {
    process.stderr.write(`SCAN_CACHE_IGNORED ${JSON.stringify({
      path: scanCachePath, message: error.message,
    })}\n`);
    return { entries: {}, warm: false };
  }
}

function writeScanCache(entries) {
  if (!scanCacheEnabled) return;
  fs.mkdirSync(path.dirname(scanCachePath), { recursive: true });
  const temporary = `${scanCachePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify({
    version: scanCacheVersion,
    rawRoot,
    writtenAt: new Date().toISOString(),
    entries,
  })}\n`);
  fs.renameSync(temporary, scanCachePath);
}

function inspectCapture(filename) {
  let events;
  try {
    events = fs.readFileSync(filename, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  } catch {
    // A capture copied while it is still being written may end with a partial
    // JSON line. It cannot establish full-game completeness yet.
    return null;
  }
  const accepted = events.find((event) => event.event === "observation_accepted");
  if (!accepted) return null;
  const profiles = new Map();
  for (const event of events) {
    if (event.event === "room_profiles_decoded") for (const player of event.players ?? []) profiles.set(player.uid, player);
  }
  const statuses = [];
  for (const event of events) {
    if (event.event !== "websocket_frame" || event.messageType !== "GameStatus") continue;
    try { statuses.push(decodeMessage("GameStatus", Buffer.from(event.protobufBase64 ?? "", "base64"))); }
    catch { /* A malformed frame cannot establish completeness. */ }
  }
  if (!statuses.length || statuses[0].round !== 1 || !statuses.at(-1).ended) return null;
  const finalRound = Math.max(...statuses.map((status) => status.round));
  const recordedRounds = new Set(statuses.map((status) => status.round));
  if (Array.from({ length: finalRound }, (_, index) => index + 1).some((round) => !recordedRounds.has(round))) return null;
  const targetUid = accepted.target?.uid ?? "";
  const target = profiles.get(targetUid) ?? accepted.target ?? {};
  const roundTwoPlayer = statuses
    .filter((status) => status.round >= 2)
    .flatMap((status) => status.publicPlayers ?? [])
    .find((player) => player.uid === targetUid && numericPrefix(player.career) > 0);
  const allPlayers = statuses.flatMap((status) => status.publicPlayers ?? []);
  const targetPlayer = statuses.flatMap((status) => [
    status.observedPrivatePlayer,
    ...(status.publicPlayers ?? []),
  ]).find((player) => player?.uid === targetUid && Number(player.characterId) > 0);
  const targetCharacterId = Number(targetPlayer?.characterId ?? 0);
  const linXiaoyue = allPlayers.find((player) => player.uid === targetUid && player.characterId === 1000004)
    ?? allPlayers.find((player) => !player.ai && player.characterId === 1000004);
  const linUid = linXiaoyue?.uid ?? "";
  const linCareer = numericPrefix(allPlayers.find((player) =>
    player.uid === linUid && numericPrefix(player.career) > 0)?.career);
  const linFateIds = new Set();
  const linOfferedFateIds = new Set();
  for (const status of statuses) {
    const player = (status.publicPlayers ?? []).find((candidate) => candidate.uid === linUid);
    for (const id of player?.lastRound?.fateStrategies ?? []) if (Number(id) > 0) linFateIds.add(Number(id));
    if (status.observedPrivatePlayer?.uid === linUid) {
      for (const selection of status.observedPrivatePlayer.fateStrategies?.strategies ?? []) {
        for (const id of selection.pending ?? []) if (Number(id) > 0) linOfferedFateIds.add(Number(id));
        if (Number(selection.selected) > 0) {
          linFateIds.add(Number(selection.selected));
        }
      }
      for (const id of status.observedPrivatePlayer.fateStrategies?.banned ?? []) {
        if (Number(id) > 0) linOfferedFateIds.add(Number(id));
      }
    }
  }
  const linUnchosenFateIds = [...linOfferedFateIds].filter((id) => !linFateIds.has(id));
  const humanOpponentCharacterIds = new Set(allPlayers
    .filter((player) => player.uid !== linUid && !player.ai && Number(player.characterId) > 0)
    .map((player) => Number(player.characterId)));
  return {
    filename,
    targetUid,
    targetUsername: target.username || target.name || targetUid,
    targetCharacterId,
    startingRating: Number(target.actualModeScore ?? target.daoXinRankScore ?? target.rankScore ?? 0),
    career: numericPrefix(roundTwoPlayer?.career),
    rounds: finalRound,
    capturedThrough: events.at(-1)?.observedAt ?? "",
    linCareer,
    linFates: [...linFateIds].sort((first, second) => first - second).map((id) => {
      const info = fateStrategyInfo(id);
      return { id, nameEnglish: info.nameEnglish, nameChinese: info.nameChinese };
    }),
    linUnchosenFates: linUnchosenFateIds.sort((first, second) => first - second).map((id) => {
      const info = fateStrategyInfo(id);
      return { id, nameEnglish: info.nameEnglish, nameChinese: info.nameChinese };
    }),
    humanOpponentCharacters: [...humanOpponentCharacterIds]
      .sort((first, second) => first - second).map(characterInfo),
  };
}

fs.mkdirSync(dataRoot, { recursive: true });
const existingCatalogPath = path.join(dataRoot, "catalog.js");
const existingCatalog = catalogOnly && fs.existsSync(existingCatalogPath)
  ? JSON.parse(fs.readFileSync(existingCatalogPath, "utf8")
    .replace(/^window\.RECORDING_CATALOG = /, "").replace(/;\s*$/, ""))
  : [];
const priorScanCache = readScanCache();
const nextScanCacheEntries = {};
let inspectedCaptureFiles = 0;
let reusedCaptureInspections = 0;
const captures = filesBelow(rawRoot).map((filename) => {
  const relativeName = path.relative(rawRoot, filename);
  const fingerprint = captureFingerprint(filename);
  const cached = priorScanCache.entries[relativeName];
  let capture;
  let sourceChanged = false;
  if (cached && sameFingerprint(cached.fingerprint, fingerprint)) {
    capture = cached.capture ? { ...cached.capture, filename } : null;
    reusedCaptureInspections += 1;
  } else {
    capture = inspectCapture(filename);
    sourceChanged = Boolean(cached);
    inspectedCaptureFiles += 1;
  }
  nextScanCacheEntries[relativeName] = {
    fingerprint,
    capture: capture ? Object.fromEntries(Object.entries(capture)
      .filter(([key]) => key !== "filename" && key !== "sourceChanged")) : null,
  };
  return capture ? { ...capture, sourceChanged } : null;
}).filter(Boolean)
  .filter((capture) => capture.targetCharacterId === 1000004)
  .filter((capture) => !maxCapturedThrough || capture.capturedThrough <= maxCapturedThrough)
  .filter((capture) => !excludedCaptureNames.has(path.basename(capture.filename)))
  .sort((first, second) => second.capturedThrough.localeCompare(first.capturedThrough));
process.stdout.write(`scan: ${inspectedCaptureFiles} inspected, ${reusedCaptureInspections} reused, ${captures.length} complete${priorScanCache.warm ? "" : " (cache initialized)"}\n`);
const catalog = [];
const generatedFiles = new Set();
const drawAudit = [];
const cultivationAudit = [];
const buildFailures = [];
const builtIds = new Set();
if (!catalogOnly && buildJobs > 1) {
  const pending = captures.map((capture) => {
    const id = publicRecordingId(capture);
    const outputPath = path.join(dataRoot, `${id}.compact.js`);
    return { capture, id, outputPath };
  }).filter((item) => forceRebuild || regressionRecordingIds.has(item.id)
    || item.capture.sourceChanged || !fs.existsSync(item.outputPath));
  let cursor = 0;
  let completed = 0;
  const buildOne = ({ capture, id, outputPath }) => new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, "build_data.mjs"), capture.filename, outputPath], {
      env: { ...process.env, YXP_WIKI_ROOT: wikiRoot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr, capture, id }));
  });
  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= pending.length) return;
      const result = await buildOne(pending[index]);
      completed += 1;
      if (result.status !== 0) {
        const output = (result.stderr || result.stdout).trim();
        const message = output.split("\n").find((line) => line.startsWith("Error:"))
          ?? output.split("\n").at(-1) ?? "unknown error";
        buildFailures.push({ filename: result.capture.filename, message });
        process.stderr.write(`BUILD_FAILURE ${JSON.stringify(buildFailures.at(-1))}\n`);
      } else if (process.env.YXP_DRAW_AUDIT) {
        for (const line of result.stdout.split("\n")) {
          if (line.startsWith("DRAW_AUDIT ")) drawAudit.push({ recording: result.id, ...JSON.parse(line.slice(11)) });
          if (line.startsWith("CULTIVATION_AUDIT ")) cultivationAudit.push({ recording: result.id, ...JSON.parse(line.slice(18)) });
        }
      }
      if (result.status === 0) builtIds.add(result.id);
      process.stdout.write(`[build ${completed}/${pending.length}] ${result.capture.targetUsername} · ${result.capture.rounds} rounds\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(buildJobs, pending.length) }, worker));
  if (buildFailures.length && !skipBuildFailures) {
    process.stderr.write(`BUILD_FAILURE_SUMMARY ${JSON.stringify(buildFailures)}\n`);
    process.exit(1);
  }
}
for (const [position, capture] of captures.entries()) {
  const id = publicRecordingId(capture);
  const outputName = `${id}.compact.js`;
  if (generatedFiles.has(outputName)) throw new Error(`public recording ID collision for ${capture.filename}`);
  generatedFiles.add(outputName);
  const outputPath = path.join(dataRoot, outputName);
  if (catalogOnly && !fs.existsSync(outputPath)) continue;
  if (!catalogOnly && !builtIds.has(id)
    && (regressionRecordingIds.has(id)
      || !(reuseExisting && !forceRebuild && !capture.sourceChanged && fs.existsSync(outputPath)))) {
    const result = spawnSync(process.execPath, [path.join(here, "build_data.mjs"), capture.filename, outputPath], {
      encoding: "utf8",
      env: { ...process.env, YXP_WIKI_ROOT: wikiRoot },
    });
    if (result.status !== 0) {
      const output = (result.stderr || result.stdout).trim();
      if (process.env.YXP_COLLECT_BUILD_FAILURES || skipBuildFailures) {
        const message = output.split("\n").find((line) => line.startsWith("Error:")) ?? output.split("\n").at(-1) ?? "unknown error";
        buildFailures.push({ filename: capture.filename, message });
        process.stderr.write(`BUILD_FAILURE ${JSON.stringify(buildFailures.at(-1))}\n`);
        continue;
      }
      process.stderr.write(`${output}\n`);
      throw new Error(`failed to build ${capture.filename}`);
    }
    if (process.env.YXP_DRAW_AUDIT) {
      for (const line of result.stdout.split("\n")) {
        if (line.startsWith("DRAW_AUDIT ")) drawAudit.push({ recording: id, ...JSON.parse(line.slice(11)) });
        if (line.startsWith("CULTIVATION_AUDIT ")) cultivationAudit.push({ recording: id, ...JSON.parse(line.slice(18)) });
      }
    }
    builtIds.add(id);
  }
  catalog.push({
    id,
    file: outputName,
    targetUid: capture.targetUid,
    targetUsername: capture.targetUsername,
    targetCharacterId: capture.targetCharacterId,
    startingRating: capture.startingRating,
    career: capture.career,
    rounds: capture.rounds,
    capturedThrough: capture.capturedThrough,
    linCareer: capture.linCareer,
    linFates: capture.linFates,
    linUnchosenFates: capture.linUnchosenFates,
    humanOpponentCharacters: capture.humanOpponentCharacters,
    label: `${capture.targetUsername} · ${capture.rounds} rounds`,
  });
  if (!incremental || builtIds.has(id)) {
    process.stdout.write(`[${position + 1}/${captures.length}] ${catalog.at(-1).label}\n`);
  }
}
if (catalogOnly) {
  const catalogIds = new Set(catalog.map((item) => item.id));
  for (const item of existingCatalog) {
    if (catalogIds.has(item.id) || !fs.existsSync(path.join(dataRoot, item.file))) continue;
    catalog.push(item);
  }
}
if (buildFailures.length && !skipBuildFailures) {
  process.stderr.write(`BUILD_FAILURE_SUMMARY ${JSON.stringify(buildFailures)}\n`);
  process.exit(1);
}
if (buildFailures.length) process.stderr.write(`BUILD_FAILURE_SUMMARY ${JSON.stringify(buildFailures)}\n`);
for (const failure of buildFailures) {
  delete nextScanCacheEntries[path.relative(rawRoot, failure.filename)];
}
if (!catalogOnly) for (const filename of fs.readdirSync(dataRoot)) {
  if (filename.endsWith(".compact.js") && !generatedFiles.has(filename)) fs.rmSync(path.join(dataRoot, filename));
}
catalog.sort((first, second) => first.targetUid.localeCompare(second.targetUid)
  || second.capturedThrough.localeCompare(first.capturedThrough));
fs.writeFileSync(path.join(dataRoot, "catalog.js"), `window.RECORDING_CATALOG = ${JSON.stringify(catalog)};\n`);
writeScanCache(nextScanCacheEntries);
console.log(`wrote ${catalog.length} complete recordings to ${dataRoot}`);
if (process.env.YXP_DRAW_AUDIT) {
  const byCount = Object.fromEntries([...new Set(drawAudit.map((entry) => entry.count))]
    .sort((first, second) => first - second)
    .map((count) => [count, drawAudit.filter((entry) => entry.count === count).length]));
  const bySource = Object.fromEntries([...new Set(drawAudit.map((entry) => entry.source))]
    .sort().map((source) => [source, drawAudit.filter((entry) => entry.source === source).length]));
  console.log(`DRAW_AUDIT_SUMMARY ${JSON.stringify({ transitions: drawAudit.length, byCount, bySource })}`);
  console.log(`CULTIVATION_AUDIT_SUMMARY ${JSON.stringify({
    transitions: cultivationAudit.length,
    exact: cultivationAudit.filter((entry) => entry.delta === 0).length,
    choiceCoincident: cultivationAudit.filter((entry) => entry.delta !== 0 && entry.choiceAdvanced).length,
    choiceCoincidentExamples: cultivationAudit.filter((entry) => entry.delta !== 0 && entry.choiceAdvanced),
    unexplained: cultivationAudit.filter((entry) => entry.delta !== 0 && !entry.choiceAdvanced).length,
    unexplainedExamples: cultivationAudit.filter((entry) => entry.delta !== 0 && !entry.choiceAdvanced).slice(0, 20),
  })}`);
}
