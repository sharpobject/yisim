#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { decodeMessage } from "../scripts/decode_live_observation.mjs";
import { readPackedRecording, readRecordingCatalog } from "./recording-data-io.mjs";

const [rawRoot, dataRoot] = process.argv.slice(2).map((value) => value && path.resolve(value));
if (!rawRoot || !dataRoot) {
  throw new Error("usage: audit_built_battle_destiny.mjs RAW_CAPTURE_ROOT BUILT_DATA_ROOT");
}

function filesBelow(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(filename)
      : entry.name.endsWith(".jsonl") ? [filename] : [];
  });
}

function recordingId(targetUid, capturedThrough) {
  return `r-${createHash("sha256").update(`${targetUid}\0${capturedThrough}`).digest("hex").slice(0, 16)}`;
}

function mergePatch(target, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return structuredClone(patch);
  const result = target && typeof target === "object" && !Array.isArray(target) ? structuredClone(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && value.$deleted === true) delete result[key];
    else result[key] = mergePatch(result[key], value);
  }
  return result;
}

const talentRuntime = (player, id) => Number((player?.talents ?? [])
  .find((entry) => Number(entry?.id ?? entry) === id)?.runtime?.value);
const hasTalent = (player, id) => (player?.talents ?? [])
  .some((entry) => Number(entry?.id ?? entry) === id);
const hasDewJadeVase = (player) => (player?.deck ?? [])
  .some((id) => [99000101, 99010101, 99020101].includes(Number(id)));

function rawBattlePlayer(player) {
  const publicPlayer = player?.public;
  if (!publicPlayer?.uid || !publicPlayer.lastRound) return null;
  return {
    uid: String(publicPlayer.uid),
    lifeBefore: Number(publicPlayer.lastRound.life),
    reportedDelta: Number(publicPlayer.life) - Number(publicPlayer.lastRound.life),
    hasDewJadeVase: hasDewJadeVase({ deck: publicPlayer.lastRound.deck }),
  };
}

function expectedBattleDelta(rawBattle, rawPlayer, actualPlayer) {
  if (actualPlayer.innerDemon) return 0;
  if (rawPlayer.uid === rawBattle.winnerUid) {
    return rawPlayer.hasDewJadeVase && rawPlayer.reportedDelta > 0 ? rawPlayer.reportedDelta : 0;
  }
  if (!rawPlayer.hasDewJadeVase && rawBattle.destinyDamage > 0) return -rawBattle.destinyDamage;
  return rawPlayer.reportedDelta;
}

function samePlayer(actual, rawBattle, expected) {
  return actual && actual.uid === expected.uid
    && Number(actual.lifeBefore) === expected.lifeBefore
    && Number(actual.lifeDelta) === expectedBattleDelta(rawBattle, expected, actual);
}

const failures = [];
const stats = {
  recordings: 0,
  battles: 0,
  modalPlayers: 0,
  positiveBattleDeltas: 0,
  negativeBattleDeltas: 0,
  zeroBattleDeltas: 0,
  fiveElementsInfuseEvents: 0,
  fiveElementsInfuseProgressConsistent: 0,
  fiveElementsInfuseTransformations: 0,
};
const { catalog, sharedCatalog } = readRecordingCatalog(dataRoot);
const catalogIds = new Set(catalog.map((item) => item.id));
const scanCachePath = path.join(rawRoot, ".recording-browser-build-cache.json");
let capturePaths = null;
const captureMetadataByPath = new Map();
if (fs.existsSync(scanCachePath)) {
  const cache = JSON.parse(fs.readFileSync(scanCachePath, "utf8"));
  const byId = new Map();
  for (const [relativePath, entry] of Object.entries(cache.entries ?? {})) {
    const capture = entry.capture;
    if (!capture) continue;
    const id = recordingId(capture.targetUid ?? "", capture.capturedThrough ?? "");
    if (catalogIds.has(id)) {
      const capturePath = path.join(rawRoot, relativePath);
      byId.set(id, capturePath);
      captureMetadataByPath.set(capturePath, capture);
    }
  }
  const missing = [...catalogIds].filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`scan cache is missing ${missing.length} published capture(s)`);
  capturePaths = [...byId.values()];
}

const filteredEventsByPath = new Map();
if (capturePaths) {
  const result = spawnSync("rg", [
    "-n", "--no-heading", "--with-filename",
    String.raw`"event":"observation_accepted"|"messageType":"BattleResult"`,
    ...capturePaths,
  ], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (![0, 1].includes(result.status)) throw new Error(`failed to scan capture battle records: ${result.stderr}`);
  for (const line of result.stdout.split("\n").filter(Boolean)) {
    const match = /^(.+?):(\d+):(\{.*\})$/.exec(line);
    if (!match) continue;
    const [, capturePath, lineNumber, json] = match;
    const rows = filteredEventsByPath.get(capturePath) ?? [];
    rows.push({ line: Number(lineNumber), event: JSON.parse(json) });
    filteredEventsByPath.set(capturePath, rows);
  }
}

for (const capturePath of capturePaths ?? filesBelow(rawRoot)) {
  let accepted = null;
  let capturedThrough = "";
  const rawBattleEvents = [];
  const cachedCapture = captureMetadataByPath.get(capturePath);
  if (cachedCapture) {
    const rows = filteredEventsByPath.get(capturePath) ?? [];
    const acceptedRow = rows.find(({ event }) => event.event === "observation_accepted");
    if (!acceptedRow) continue;
    accepted = acceptedRow.event;
    capturedThrough = cachedCapture.capturedThrough ?? "";
    rawBattleEvents.push(...rows
      .filter(({ line, event }) => line > acceptedRow.line && event.messageType === "BattleResult")
      .map(({ event }) => event));
  } else try {
    const lines = fs.readFileSync(capturePath, "utf8").trim().split("\n").filter(Boolean);
    capturedThrough = JSON.parse(lines.at(-1)).observedAt ?? "";
    for (const line of lines) {
      if (!accepted && line.includes('"event":"observation_accepted"')) {
        accepted = JSON.parse(line);
        continue;
      }
      if (accepted && line.includes('"messageType":"BattleResult"')) rawBattleEvents.push(JSON.parse(line));
    }
  } catch {
    continue;
  }
  if (!accepted) continue;
  const id = recordingId(accepted.target?.uid ?? "", capturedThrough);
  const builtPath = path.join(dataRoot, `${id}.compact.json.gz`);
  if (!fs.existsSync(builtPath)) continue;

  const recording = readPackedRecording(builtPath, sharedCatalog);
  let visibleState = {};
  let previousState = {};
  for (const step of recording.steps) {
    visibleState = mergePatch(visibleState, step.patch);
    if (!step.battle) for (const action of (step.humanActions ?? []).filter((candidate) => candidate.kind === "destiny")) {
      for (const change of (action.changes ?? []).filter((candidate) => Number(candidate.delta) > 0)) {
        const beforePlayer = previousState.players?.[change.actorUid];
        const afterPlayer = visibleState.players?.[change.actorUid];
        const beforeProgress = talentRuntime(beforePlayer, 133);
        const afterProgress = talentRuntime(afterPlayer, 133);
        if (Number.isFinite(beforeProgress) && Number.isFinite(afterProgress) && afterProgress > beforeProgress) {
          stats.fiveElementsInfuseEvents += 1;
          // The runtime counts round-start triggers, while each trigger grants
          // one Destiny per distinct Five Element currently in the deck.
          const triggers = afterProgress - beforeProgress;
          if (Number(change.delta) >= triggers && Number(change.delta) <= triggers * 5) {
            stats.fiveElementsInfuseProgressConsistent += 1;
          } else {
            failures.push({ id, issue: "Five Elements Infuse destiny gain is inconsistent with trigger progress", change, beforeProgress, afterProgress });
          }
        } else if (Number.isFinite(beforeProgress) && hasTalent(afterPlayer, 134)) {
          stats.fiveElementsInfuseEvents += 1;
          stats.fiveElementsInfuseTransformations += 1;
        }
      }
    }
    previousState = visibleState;
  }
  // A late Cup observation can reuse a room journal that already contains a
  // battle from before this perspective was accepted. Only compare traffic
  // that belongs to the accepted observation window.
  const rawBattles = rawBattleEvents.map((event) => {
    const decoded = decodeMessage("BattleResult", Buffer.from(event.protobufBase64 ?? "", "base64"));
    return {
      round: Number(decoded.round),
      winnerUid: String(decoded.winnerUid ?? ""),
      destinyDamage: Math.abs(Number(decoded.destinyDamage ?? 0)),
      players: [rawBattlePlayer(decoded.p1), rawBattlePlayer(decoded.p2)].filter(Boolean),
    };
  });
  const builtBattleSteps = recording.steps.filter((step) => step.battle);
  const firstRawRound = Math.min(...rawBattles.map((battle) => battle.round));
  // Compact public payloads intentionally omit source metadata. Battles before
  // the first BattleResult received after acceptance are the replay opening;
  // battles from that round onward must correspond one-for-one to raw traffic.
  const replayOpeningBattleSteps = builtBattleSteps.filter((step) =>
    Number(step.battle.round) < firstRawRound);
  const liveBattleSteps = builtBattleSteps.filter((step) => Number(step.battle.round) >= firstRawRound);
  stats.recordings += 1;
  if (replayOpeningBattleSteps.some((step) => Number(step.battle.round) >= firstRawRound)) {
    failures.push({ id, issue: "replay opening battle overlaps live battle range", firstRawRound,
      replayRounds: replayOpeningBattleSteps.map((step) => Number(step.battle.round)) });
    continue;
  }
  if (rawBattles.length !== liveBattleSteps.length) {
    failures.push({ id, issue: "live battle count", raw: rawBattles.length, builtLive: liveBattleSteps.length,
      replayOpening: replayOpeningBattleSteps.length });
    continue;
  }

  for (let index = 0; index < rawBattles.length; index += 1) {
    const battle = liveBattleSteps[index].battle;
    const authoritative = battle.matchups?.find((matchup) => matchup.authoritative);
    const actualPlayers = Object.values(authoritative?.players ?? {});
    const rawBattle = rawBattles[index];
    const expectedPlayers = rawBattle.players;
    if (actualPlayers.length !== expectedPlayers.length
      || expectedPlayers.some((expected) => !actualPlayers.some((actual) => samePlayer(actual, rawBattle, expected)))) {
      failures.push({ id, round: battle.round, issue: "authoritative battle differs from BattleResult", rawBattle, actualPlayers });
    }
  }

  for (const step of builtBattleSteps) {
    const battle = step.battle;
    const authoritative = battle.matchups?.find((matchup) => matchup.authoritative);
    const actualPlayers = Object.values(authoritative?.players ?? {});
    stats.battles += 1;
    stats.modalPlayers += actualPlayers.length;
    for (const player of actualPlayers) {
      if (player.lifeDelta > 0) stats.positiveBattleDeltas += 1;
      else if (player.lifeDelta < 0) stats.negativeBattleDeltas += 1;
      else stats.zeroBattleDeltas += 1;
      if (player.result === "win" && Number(player.lifeDelta) < 0) {
        failures.push({ id, round: battle.round, issue: "winner has negative battle destiny delta", player });
      }
      if (Number(player.lifeDelta) > 0 && !hasDewJadeVase(player)) {
        failures.push({ id, round: battle.round, issue: "positive battle destiny without Dew Jade Vase", player });
      }
    }
    const expectedByUid = new Map();
    for (const player of battle.matchups.flatMap((matchup) => Object.values(matchup.players ?? {}))) {
      if (Number(player.lifeDelta) !== 0 && !expectedByUid.has(player.uid)) {
        expectedByUid.set(player.uid, Number(player.lifeDelta));
      }
    }
    const expectedChanges = [...expectedByUid].map(([uid, delta]) => `${uid}:${delta}`).sort();
    const actualChanges = (step?.humanActions ?? []).filter((action) => action.kind === "destiny")
      .flatMap((action) => action.changes ?? [])
      .map((change) => `${change.actorUid}:${Number(change.delta)}`).sort();
    if (JSON.stringify(actualChanges) !== JSON.stringify(expectedChanges)) {
      failures.push({ id, round: battle.round, issue: "battle destiny action differs from modal", expectedChanges, actualChanges });
    }
  }
}

if (failures.length) {
  for (const failure of failures.slice(0, 100)) console.error(`BATTLE_DESTINY_AUDIT_FAILURE ${JSON.stringify(failure)}`);
  throw new Error(`${failures.length} battle destiny audit failure(s)`);
}
console.log(`BATTLE_DESTINY_AUDIT ${JSON.stringify(stats)}`);
