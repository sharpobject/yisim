#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {readRecordingCatalog,readPackedRecording,recordingFiles} from './recording-data-io.mjs';
const root=path.resolve(process.argv[2]??'replay_browser/data');
const {catalog,sharedCatalog}=readRecordingCatalog(root);
const totals={recordings:catalog.length,draw:0,gain:0,cards:0,beforeImmediateExchange:0};
assert.deepEqual(new Set(recordingFiles(root)),new Set(catalog.map(e=>e.file)),'No non-public payloads');
function patch(s,d){if(!d||typeof d!=='object'||Array.isArray(d))return structuredClone(d);s=s&&typeof s==='object'&&!Array.isArray(s)?s:{};for(const[k,v]of Object.entries(d)){assert(!['codeId','roomId'].includes(k),'Private room identifier');if(v?.$deleted)delete s[k];else s[k]=patch(s[k],v)}return s}
const diff=(a,b)=>{const left=[...a];return b.filter(id=>{const i=left.indexOf(id);if(i<0)return true;left.splice(i,1);return false})};
for(const entry of catalog){
 assert.equal(entry.targetCharacterId,1000004,'Only Lin Xiaoyue is public');
 const r=readPackedRecording(path.join(root,entry.file),sharedCatalog);let s={};
 for(const[i,t]of r.steps.entries()){
  const before=[...(s.privatePlayer?.hand??[])];s=patch(s,t.patch??{});
  const actions=(t.humanActions??[]).filter(a=>['draw','gain'].includes(a.kind));
  for(const a of actions){
   const ctx=`${entry.id} step ${i+1}`;
   assert.equal(s.privatePlayer?.choiceOverlay,undefined,ctx+' modal must be closed');
   assert(a.cards?.length&&a.sources?.length,ctx+' cards and sources required');
   assert.deepEqual(diff(before,s.privatePlayer.hand).sort((a,b)=>a-b),[...a.cards].sort((a,b)=>a-b),ctx+' visible newly acquired hand cards');
   assert(a.textEnglish.startsWith(a.kind==='draw'?'Drew ':'Gained '),ctx+' English verb');
   assert(a.textChinese.includes(a.kind==='draw'?'抽取':'获得'),ctx+' Chinese verb');
   totals[a.kind]++;totals.cards+=a.cards.length;
   if(r.steps[i+1]?.humanActions?.some(x=>x.kind==='exchange'))totals.beforeImmediateExchange++;
  }
 }
}
console.log(JSON.stringify(totals,null,2));
