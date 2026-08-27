#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function applyPatch(before, patch) {
  if (patch == null || typeof patch !== "object" || Array.isArray(patch)) return clone(patch);
  const output = before && typeof before === "object" && !Array.isArray(before)
    ? before : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && value.$deleted === true) {
      delete output[key];
    } else {
      output[key] = applyPatch(output[key], value);
    }
  }
  return output;
}

function readCompact(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const start = source.indexOf("=");
  const end = source.lastIndexOf(";");
  if (start < 0 || end <= start) throw new Error(`could not parse ${filename}`);
  return JSON.parse(source.slice(start + 1, end));
}

function selectedChoiceIds(values = []) {
  return values
    .filter((value) => Number(value?.choiceHistory?.selected) > 0)
    .map((value) => Number(value?.id))
    .filter((value) => value > 0);
}

function choiceSnapshot(state = {}) {
  const privatePlayer = state.privatePlayer ?? {};
  const uid = privatePlayer.uid;
  const player = state.players?.[uid] ?? {};
  return {
    privateUid: uid,
    talentIds: selectedChoiceIds(player.talents),
    fateIds: selectedChoiceIds(privatePlayer.selectedFateStrategies),
    daoYunCount: privatePlayer.daoYunChoices?.length ?? 0,
    cardSelectionCount: privatePlayer.cardSelections?.length ?? 0,
    overlayKind: privatePlayer.choiceOverlay?.kind ?? null,
  };
}

function choiceRevealKinds(before, after) {
  if (!before.privateUid || before.privateUid !== after.privateUid) return [];
  const revealed = [];
  const beforeTalents = new Set(before.talentIds);
  for (const id of after.talentIds) if (!beforeTalents.has(id)) revealed.push("immortal-fate");
  const beforeFates = new Set(before.fateIds);
  for (const id of after.fateIds) if (!beforeFates.has(id)) revealed.push("heavenly-derivation");
  for (let index = before.daoYunCount; index < after.daoYunCount; index += 1) revealed.push("daoist-rhyme");
  for (let index = before.cardSelectionCount; index < after.cardSelectionCount; index += 1) revealed.push("card-selection");
  return revealed;
}

const root = path.resolve(process.argv[2] ?? "");
if (!root || !fs.existsSync(root)) throw new Error("usage: audit_timeline_steps.mjs /path/to/recording/data");

const files = fs.readdirSync(root).filter((name) => name.endsWith(".compact.js")).sort();
const totals = {
  recordings: files.length,
  steps: 0,
  strictNoops: 0,
  consecutiveNoopRuns: 0,
  choiceReveals: 0,
  revealWithPriorModal: 0,
  revealWithoutPriorModal: 0,
  stepsWithMultipleChoiceReveals: 0,
  maximumChoicesRevealedInOneStep: 0,
};
const byKind = {};
const noopsByRecording = [];
const missingModalExamples = [];
const multipleRevealExamples = [];
const revealFollowups = {};

for (const name of files) {
  const payload = readCompact(path.join(root, name));
  let state = {};
  let priorChoice = choiceSnapshot(state);
  let inNoopRun = false;
  const noops = [];
  for (let index = 0; index < payload.steps.length; index += 1) {
    const step = payload.steps[index];
    state = applyPatch(state, step.patch ?? {});
    const currentChoice = choiceSnapshot(state);
    totals.steps += 1;
    const strictNoop = Object.keys(step.patch ?? {}).length === 0
      && !(step.humanActions?.length)
      && !step.battle;
    if (strictNoop) {
      totals.strictNoops += 1;
      noops.push(index + 1);
      if (!inNoopRun) totals.consecutiveNoopRuns += 1;
      inNoopRun = true;
    } else {
      inNoopRun = false;
    }

    const revealedKinds = choiceRevealKinds(priorChoice, currentChoice);
    if (revealedKinds.length > 1) {
      totals.stepsWithMultipleChoiceReveals += 1;
      if (multipleRevealExamples.length < 20) multipleRevealExamples.push({
        recording: payload.id,
        step: index + 1,
        kinds: revealedKinds,
        actions: (step.humanActions ?? []).map((action) => action.kind),
      });
    }
    totals.maximumChoicesRevealedInOneStep = Math.max(totals.maximumChoicesRevealedInOneStep, revealedKinds.length);
    for (const kind of revealedKinds) {
      totals.choiceReveals += 1;
      const priorKind = priorChoice.overlayKind;
      const matched = priorKind === kind;
      const bucket = byKind[kind] ??= { reveals: 0, withPriorModal: 0, withoutPriorModal: 0 };
      bucket.reveals += 1;
      if (matched) {
        totals.revealWithPriorModal += 1;
        bucket.withPriorModal += 1;
      } else {
        totals.revealWithoutPriorModal += 1;
        bucket.withoutPriorModal += 1;
        if (missingModalExamples.length < 40) missingModalExamples.push({
          recording: payload.id,
          step: index + 1,
          kind,
          priorOverlay: priorKind,
          actions: (step.humanActions ?? []).map((action) => action.kind),
        });
      }
      const followup = revealFollowups[kind] ??= { reveals: 0, followedByStrictNoop: 0 };
      followup.reveals += 1;
      if (index + 1 < payload.steps.length
          && Object.keys(payload.steps[index + 1].patch ?? {}).length === 0
          && !(payload.steps[index + 1].humanActions?.length)
          && !payload.steps[index + 1].battle) {
        followup.followedByStrictNoop += 1;
      }
    }
    priorChoice = currentChoice;
  }
  if (noops.length) noopsByRecording.push({ recording: payload.id, count: noops.length, steps: noops });
}

noopsByRecording.sort((first, second) => second.count - first.count || first.recording.localeCompare(second.recording));
console.log(JSON.stringify({
  totals,
  byKind,
  recordingsWithNoops: noopsByRecording.length,
  noopsByRecording: noopsByRecording.slice(0, 5).map(({ recording, count, steps }) => ({
    recording,
    count,
    steps: steps.slice(0, 30),
  })),
  missingModalExamples,
  multipleRevealExamples,
  revealFollowups,
}, null, 2));
