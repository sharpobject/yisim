import test from 'node:test';
import assert from 'node:assert/strict';
import { openingShopResidual, replayInputFingerprint } from './opening-repair.mjs';
const aggregate={combinedCardsEstimate:1,absorbedCardsEstimate:2,exchangesSpentEstimate:3};
const actions=[{kind:'upgrade'},{kind:'absorb'},{kind:'absorb'},{kind:'exchange'},{kind:'exchange'},{kind:'exchange'}];
test('a complete live shop gets no duplicate aggregate',()=>{
 assert.deepEqual(openingShopResidual(aggregate,actions,'self').missing,{combined:0,absorbed:0,processed:0,exchanges:0});
});
test('only unobserved activity remains; opponent actions do not cancel it',()=>{
 const result=openingShopResidual(aggregate,[{kind:'upgrade',actorUid:'other'},{kind:'absorb',actorUid:'self'},{kind:'exchange',actorUid:'self'}],'self');
 assert.deepEqual(result.missing,{combined:1,absorbed:1,processed:0,exchanges:2});
});
test('uncertain or missing summaries cannot manufacture opening actions',()=>{
 assert.equal(openingShopResidual(null,actions,'self').usable,false);
 assert.equal(openingShopResidual({...aggregate,uncertain:true},[],'self').usable,false);
});
test('underestimated replay totals retain all live actions and report the discrepancy',()=>{
 const result=openingShopResidual({exchangesSpentEstimate:1},[{kind:'exchange'},{kind:'exchange'}],'self');
 assert.deepEqual(result.missing,{combined:0,absorbed:0,processed:0,exchanges:0});
 assert.deepEqual(result.undercounted,['exchanges']);
});
test('new, modified, removed replay inputs invalidate a cached build',()=>{
 const absent=replayInputFingerprint('',null), original=replayInputFingerprint('/replay',{size:'1',mtimeNs:'1'});
 assert.notEqual(absent,original);
 assert.notEqual(original,replayInputFingerprint('/replay',{size:'1',mtimeNs:'2'}));
 assert.notEqual(original,replayInputFingerprint('/replay',{size:'2',mtimeNs:'1'}));
 assert.equal(original,replayInputFingerprint('/replay',{size:'1',mtimeNs:'1'}));
 assert.notEqual(original,replayInputFingerprint('/replay',{size:'1',mtimeNs:'1'},2));
});

test('a combined card later absorbed is not counted as an additional missing absorb',()=>{
 const result=openingShopResidual({combinedCardsEstimate:0,absorbedCardsEstimate:2,processedCardsEstimate:2,exchangesSpentEstimate:1},[{kind:'upgrade'},{kind:'absorb'},{kind:'exchange'}],'self');
 assert.deepEqual(result.missing,{combined:0,absorbed:0,processed:0,exchanges:0});
});

import {selectReplayPerspectives} from './generate_replay_summary_html.mjs';
test('an AI perspective retaining human metadata cannot replace the human perspective',()=>{
 const round=uid=>({round:1,p1:{publicData:{uid}},p2:{publicData:{uid:'opponent'}}});
 const target={filename:'real',data:{uid:'self',roundStats:[round('self')]}};
 const bad={filename:'ai',data:{uid:'self',roundStats:[round('ai7-lv5')]}};
 const result=selectReplayPerspectives([target,bad],target);
 assert.deepEqual(result,[target]);
 assert.throws(()=>selectReplayPerspectives([target,bad],bad),/do not belong/);
});
