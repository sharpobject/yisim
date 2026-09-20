import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./build_data.mjs',import.meta.url),'utf8');
const ctx=vm.createContext({structuredClone, numericCardId:v=>Number(v?.id??v)||0, compactCardName:(v,lang)=>`Card ${v}`, playerIdentity:()=>({uid:'p',username:'Player'}),state:{}, combinationResultId:()=>0});
for(const [start,end] of [['function actionFor(', 'function destinyAction('],['function humanAction(', 'function apply('],['function applyRecordedCardStep(', 'function recordedCultivationDelta('],['function recordedCultivationDelta(', 'function explicitChoiceCardCount(']]) vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);
const privateState=()=>({uid:'p',hand:[301,302],deck:[],cardStorage:{199:[0,303,0]}});
for(const [params,hand,storage,cult] of [
 [[0,0,6,0],[302],[301,303,0],1],
 [[0,0,6,1],[302,303],[0,301,0],0],
 [[6,1,0],[301,302,303],[0,0,0],-1],
 [[6,1,6,0],[301,302],[303,0,0],0],
]){
 const p=privateState(),d={operation:1,useCase:6,otherParams:params},step={type:'CardOperationResp',details:d};
 assert.equal(ctx.recordedCultivationDelta(p,step),cult);
 const a=ctx.humanAction(step.type,d,{privatePlayer:p});assert(a.textEnglish.includes('Vase'));assert(a.textChinese.includes('玉瓶'));assert.equal(a.vaseTransfer.cardId,params[0]===0?301:303);
 assert(ctx.applyRecordedCardStep(p,step));assert.deepEqual(JSON.parse(JSON.stringify(p.hand)),hand);assert.deepEqual(JSON.parse(JSON.stringify(p.cardStorage[199])),storage);
}
const viewer=fs.readFileSync(new URL('./replay-browser.js',import.meta.url),'utf8');
vm.runInContext(viewer.slice(viewer.indexOf('  function vaseIconId('),viewer.indexOf('  function renderCharacter(')),ctx);
for(const [i,name] of ['','金灵','水灵','木灵','火灵','土灵'].entries())assert.equal(ctx.vaseIconId([123,456,0],{123:{nameChinese:name},456:{nameChinese:'土灵'}}),199+i*10000);
assert.equal(ctx.vaseIconId([0,456,0],{456:{nameChinese:'金灵'}}),199);
assert.equal(ctx.vaseIconId([123],{123:{nameChinese:'金灵·水灵'}}),20199);
console.log('PASS: vase transfer directions, displaced card, cultivation, native first-slot icon selection');
const summary=fs.readFileSync(new URL('./generate_replay_summary_html.mjs',import.meta.url),'utf8');
let replaySide={privateData:{handCards:[1],usedCards:[2],talentDatas:{199:{commonParams:[3,0,4]}}}};
const remembered=[];const replayContext=vm.createContext({roundForView:()=>({}),sideForUid:()=>replaySide,mapSelections:()=>[],selectedFateReferences:()=>[]});
vm.runInContext(summary.slice(summary.indexOf('function privatePlayerState('),summary.indexOf('export function stateForRound(')),replayContext);
let ps=replayContext.privatePlayerState({data:{uid:'p'}},1,{rememberCard:id=>remembered.push(id)});
assert.deepEqual(JSON.parse(JSON.stringify(ps.cardStorage)),{199:[3,0,4]});assert(remembered.includes(3)&&remembered.includes(4));
replaySide={privateData:{handCards:[1]}};ps=replayContext.privatePlayerState({data:{uid:'p'}},1,{rememberCard:()=>{}});assert.equal(ps.cardStorage,undefined);
console.log('PASS: replay-derived openings preserve available vase contents without inventing storage for other players');
