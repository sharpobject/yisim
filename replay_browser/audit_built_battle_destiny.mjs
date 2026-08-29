#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
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
  fiveElementsInfuseExactProgress: 0,
  fiveElementsInfuseTransformations: 0,
};
const { sharedCatalog } = readRecordingCatalog(dataRoot);

for (const capturePath of filesBelow(rawRoot)) {
  let events;
  try {
    events = fs.readFileSync(capturePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  } catch {
    continue;
  }
  const accepted = events.find((event) => event.event === "observation_accepted");
  if (!accepted) continue;
  const id = recordingId(accepted.target?.uid ?? "", events.at(-1)?.observedAt ?? "");
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
          if (afterProgress - beforeProgress === Number(change.delta)) stats.fiveElementsInfuseExactProgress += 1;
          else failures.push({ id, issue: "Five Elements Infuse progress differs from destiny gain", change, beforeProgress, afterProgress });
        } else if (Number.isFinite(beforeProgress) && hasTalent(afterPlayer, 134)) {
          stats.fiveElementsInfuseEvents += 1;
          stats.fiveElementsInfuseTransformations += 1;
        }
      }
    }
    previousState = visibleState;
  }
  const rawBattles = events.filter((event) => event.messageType === "BattleResult").map((event) => {
    const decoded = decodeMessage("BattleResult", Buffer.from(event.protobufBase64 ?? "", "base64"));
    return {
      winnerUid: String(decoded.winnerUid ?? ""),
      destinyDamage: Math.abs(Number(decoded.destinyDamage ?? 0)),
      players: [rawBattlePlayer(decoded.p1), rawBattlePlayer(decoded.p2)].filter(Boolean),
    };
  });
  const builtBattles = recording.steps.filter((step) => step.battle).map((step) => step.battle);
  stats.recordings += 1;
  if (rawBattles.length !== builtBattles.length) {
    failures.push({ id, issue: "battle count", raw: rawBattles.length, built: builtBattles.length });
    continue;
  }

  for (let index = 0; index < rawBattles.length; index += 1) {
    const battle = builtBattles[index];
    const authoritative = battle.matchups?.find((matchup) => matchup.authoritative);
    const actualPlayers = Object.values(authoritative?.players ?? {});
    const rawBattle = rawBattles[index];
    const expectedPlayers = rawBattle.players;
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
    if (actualPlayers.length !== expectedPlayers.length
      || expectedPlayers.some((expected) => !actualPlayers.some((actual) => samePlayer(actual, rawBattle, expected)))) {
      failures.push({ id, round: battle.round, issue: "authoritative battle differs from BattleResult", rawBattle, actualPlayers });
    }

    const expectedByUid = new Map();
    for (const player of battle.matchups.flatMap((matchup) => Object.values(matchup.players ?? {}))) {
      if (Number(player.lifeDelta) !== 0 && !expectedByUid.has(player.uid)) {
        expectedByUid.set(player.uid, Number(player.lifeDelta));
      }
    }
    const expectedChanges = [...expectedByUid].map(([uid, delta]) => `${uid}:${delta}`).sort();
    const step = recording.steps.find((candidate) => candidate.battle === battle);
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
