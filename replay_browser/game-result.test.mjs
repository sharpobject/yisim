import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {finalPlacement, replayRating, roundsPlayed, eliminationRoundForStatus, replayPlayerResult, settledResultPlayers} from './game-result.mjs';
const require=createRequire(import.meta.url),codec=require('./recording-codec.cjs');
const players=[{uid:'winner',rank:0,eliminationRound:null},{uid:'a',rank:1,eliminationRound:18},{uid:'b',rank:2,eliminationRound:18},{uid:'c',rank:3,eliminationRound:15}];
test('same-round eliminations share a range; winner remains first',()=>{
 assert.deepEqual(finalPlacement(players,'a'),{placementStart:2,placementEnd:3});
 assert.deepEqual(finalPlacement(players,'b'),{placementStart:2,placementEnd:3});
 assert.deepEqual(finalPlacement(players,'winner'),{placementStart:1,placementEnd:1});
 assert.deepEqual(finalPlacement(players,'c'),{placementStart:4,placementEnd:4});
 assert.deepEqual(finalPlacement(players,'missing'),{});
});
test('Cup finals retain server tie-break ordering',()=>assert.deepEqual(finalPlacement(players,'b',true),{placementStart:3,placementEnd:3}));
const replay={uid:'a',charId:1000004,gameMode:3,isDaoXinRank:true,beginRankScore:9646,diffRankScore:0,beginDaoXinRankScore:9081,diffDaoXinRankScore:-70,roundStats:[{p1:{publicData:{uid:'a'}}}]};
test('rating uses matching settlement and correct rating system',()=>{
 assert.deepEqual(replayRating(replay,'a',1000004),{startingRating:9081,ratingChange:-70,ratingKind:'dao'});
 assert.equal(replayRating({...replay,isDaoXinRank:false},'a',1000004).ratingChange,0);
 assert.deepEqual(replayRating({...replay,roundStats:[{p1:{publicData:{uid:'bot'}}}]},'a',1000004),{});
 assert.deepEqual(replayRating({...replay,gameMode:2},'a',1000004),{});
 assert.equal(replayRating({...replay,diffDaoXinRankScore:undefined},'a',1000004).ratingChange,null);
});
const shared={cards:{},talents:{},fateStrategies:{},characters:{}};
const item={id:'r-test',targetUid:'a',targetUsername:'A',targetCharacterId:1000004,startingRating:9081,career:1,rounds:18,capturedThrough:'2026-09-25',linCareer:1,gameMode:3,...finalPlacement(players,'a'),ratingChange:-70,ratingKind:'dao'};
test('catalog preserves result fields and reads legacy rows as unknown',()=>{
 const packed=codec.packCatalog(shared,[item]);const got=codec.unpackCatalog(packed).catalog[0];
 for(const k of ['placementStart','placementEnd','ratingChange','ratingKind'])assert.equal(got[k],item[k]);
 packed[2][0][3][0].length=15;
 const old=codec.unpackCatalog(packed).catalog[0];assert.equal(old.placementStart,null);assert.equal(old.ratingChange,null);
});
const src=fs.readFileSync(new URL('./replay-browser.js',import.meta.url),'utf8');
const label=src.slice(src.indexOf('  const recordingLabel ='),src.indexOf('  const legacyRecordingAliases'));
const render=(it,zh=false)=>vm.runInNewContext(`${label}\nrecordingLabel(item)`,{item:it,isChinese:zh,copy:{rounds:zh?'轮':'rounds',rating:zh?'分':'rating',cupFinal:'Cup final',practice:'Practice'},numericPrefix:()=>0});
test('bilingual labels distinguish tie, zero delta, missing delta and Cup final',()=>{
 assert.match(render(item),/2.5th.*9081 Dao Mind rating \(-70\)/);
 assert.doesNotMatch(render(item),/tied|2nd–3rd/);
 assert.match(render(item,true),/第2.5名.*9081 道心分（? \(-70\)/);
 assert.match(render({...item,ratingChange:0}),/\(0\)/);
 assert.match(render({...item,ratingChange:null}),/change unavailable/);
 assert.doesNotMatch(render({...item,gameMode:6,cupStage:'final'}),/rating/);
});

test("dropdown rounds stop at the recorded player elimination",()=>{
 assert.equal(roundsPlayed(players,"c",20),15);
 assert.equal(roundsPlayed(players,"winner",20),20);
});

test('elimination rounds handle preparation exits, missing battles and the final round',()=>{
 const prior={round:9,publicPlayers:[{uid:'a',life:51}]};
 assert.equal(eliminationRoundForStatus({round:9},prior,8,'a'),9);
 assert.equal(eliminationRoundForStatus({round:10},prior,8,'a'),9);
 assert.equal(eliminationRoundForStatus({round:10},prior,9,'a'),9);
 assert.equal(eliminationRoundForStatus({round:20,ended:true},{round:20},18,'a'),20);
});

test('settled human replay rounds resolve sparse observation; inherited AI metadata is excluded',()=>{
 const result=replayPlayerResult({...replay,round:19,battleRank:1});
 assert.deepEqual(result,{uid:'a',rank:1,round:19});
 assert.equal(replayPlayerResult({...replay,round:19,battleRank:1,roundStats:[{p1:{publicData:{uid:'bot'}}}]}),null);
 assert.equal(settledResultPlayers(players,[result])[1].eliminationRound,19);
 assert.equal(settledResultPlayers(players,[{...result,rank:7}])[1].eliminationRound,18);
 assert.equal(settledResultPlayers(players,[{uid:'winner',rank:0,round:20}])[0].eliminationRound,null);
});

test('dropdown counts the concession round without changing settlement placement',()=>{
 const settled=settledResultPlayers(players,[{uid:'winner',rank:0,round:17}]);
 assert.equal(roundsPlayed(settled,'winner',18),18);
 const eliminated=settledResultPlayers([{uid:'a',rank:1,eliminationRound:18}],[{uid:'a',rank:1,round:17}]);
 assert.equal(roundsPlayed(eliminated,'a',20),18);
 assert.equal(eliminated[0].eliminationRound,17);
 assert.deepEqual(finalPlacement(settled,'winner'),{placementStart:1,placementEnd:1});
});
