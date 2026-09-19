#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import {readRecordingCatalog, readPackedRecording} from "./recording-data-io.mjs";

function patch(state, delta) {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) return structuredClone(delta);
  const result = state && typeof state === "object" && !Array.isArray(state) ? state : {};
  for (const [key, value] of Object.entries(delta)) {
    if (value?.$deleted === true) delete result[key];
    else result[key] = patch(result[key], value);
  }
  return result;
}
function snapshot(state) {
  const p = state.privatePlayer ?? {};
  const player = state.players?.[p.uid] ?? {};
  return structuredClone({uid:p.uid, career:parseInt(player.career) || 0,
    additional:p.additionalCareers ?? {}, talents:player.talents ?? [], overlay:p.choiceOverlay, round:state.round});
}
const root = path.resolve(process.argv[2] ?? "replay_browser/data");
const {catalog, sharedCatalog} = readRecordingCatalog(root);
const counts = {recordings:catalog.length, regular:0, additional:0, annotatedFateStates:0};
for (const entry of catalog) {
  const recording = readPackedRecording(path.join(root, entry.file), sharedCatalog);
  let state = {}, before = snapshot(state);
  for (const [index, step] of recording.steps.entries()) {
    state = patch(state, step.patch ?? {});
    const after = snapshot(state);
    const context = entry.id + " step " + (index + 1);
    for (const [slot, career] of Object.entries(after.additional)) {
      if (!(Number(career)>0)) continue;
      const talent = after.talents[Number(slot)-1];
      if (Math.abs(Number(talent?.id)) % 10000 !== 188) continue;
      assert.equal(talent.additionalCareer, Number(career), context + " chosen fate icon");
      counts.annotatedFateStates++;
    }
    if (before.uid && before.uid === after.uid) {
      const reveals = [];
      if (!before.career && after.career) reveals.push({kind:"side-job", career:after.career, additional:false});
      for (const [slot, career] of Object.entries(after.additional)) {
        if (Number(career)>0 && Number(before.additional[slot])!==Number(career))
          reveals.push({kind:"additional-side-job", career:Number(career), additional:true});
      }
      assert(reveals.length <= 1, context + " multiple side-job reveals");
      for (const reveal of reveals) {
        assert.equal(before.overlay?.kind, reveal.kind, context + " prior modal");
        assert(before.overlay.selected == null, context + " prior modal must not reveal result");
        const options = before.overlay.options.map(x=>Number(x.id));
        assert(options.includes(reveal.career), context + " chosen job is offered");
        assert.equal(new Set(options).size, options.length, context + " distinct options");
        assert(options.length>1, context + " offers alternatives");
        assert.equal(after.overlay?.kind, reveal.kind, context + " result modal");
        assert.equal(Number(after.overlay.selected), reveal.career, context + " chosen highlight");
        assert.equal(before.round, after.round, context + " choice round");
        assert(step.humanActions?.some(a=>a.kind==="sideJob" && a.career===reveal.career && a.additional===reveal.additional), context + " timeline action");
        counts[reveal.additional ? "additional" : "regular"]++;
      }
    }
    before = after;
  }
}
console.log(JSON.stringify(counts, null, 2));
