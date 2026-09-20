import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import codec from './recording-codec.cjs';
const root=process.argv[2];
const read=p=>JSON.parse(gunzipSync(fs.readFileSync(p)));
const {catalog,sharedCatalog}=codec.unpackCatalog(read(path.join(root,'catalog.compact.json.gz')));
function patch(s,d){if(!d||typeof d!=='object'||Array.isArray(d))return structuredClone(d);s=s&&typeof s==='object'&&!Array.isArray(s)?s:{};for(const[k,v]of Object.entries(d)){if(v?.$deleted)delete s[k];else s[k]=patch(s[k],v)}return s}
let transfers=0,deposits=0,withdrawals=0,rearrangements=0,swaps=0;const icons=new Set(),samples=[];
for(const c of catalog){const p=codec.unpackRecording(read(path.join(root,c.file)),sharedCatalog);let s={};for(const [i,step]of p.steps.entries()){
 const before=structuredClone(s);s=patch(s,step.patch??{});const bp=before.privatePlayer,ap=s.privatePlayer;
 const name=p.catalog.cards[ap?.cardStorage?.[199]?.[0]]?.nameChinese??'';let icon=199;['金灵','水灵','木灵','火灵','土灵'].forEach((n,j)=>{if(name.includes(n))icon=10199+j*10000});icons.add(icon);
 for(const a of step.humanActions??[]){if(!a.vaseTransfer)continue;transfers++;const t=a.vaseTransfer,ctx=`${c.id} step ${i+1}`;assert.equal(bp?.uid,ap?.uid,ctx);const slots=[...(bp.cardStorage?.[199]??[])];while(slots.length<3)slots.push(0);const hand=[...bp.hand];
 if(t.from===0){deposits++;assert.equal(hand[t.fromIndex],t.cardId,ctx+' source hand');const [card]=hand.splice(t.fromIndex,1);if(slots[t.toIndex]){swaps++;hand.push(slots[t.toIndex]);}slots[t.toIndex]=card;}
 else if(t.to===0){withdrawals++;assert.equal(slots[t.fromIndex],t.cardId,ctx+' source vase');hand.push(slots[t.fromIndex]);slots[t.fromIndex]=0;}
 else{rearrangements++;[slots[t.fromIndex],slots[t.toIndex]]=[slots[t.toIndex],slots[t.fromIndex]];}
 assert.deepEqual(ap.cardStorage[199],slots,ctx+' vase');assert.deepEqual([...ap.hand].sort((a,b)=>a-b),hand.sort((a,b)=>a-b),ctx+' hand');
 const delta=t.from===0?(t.displacedId?0:1):t.to===0?-1:0;
 assert.equal(s.players[ap.uid].cultivation-before.players[bp.uid].cultivation,delta,ctx+' cultivation');
 if(samples.length<8)samples.push({id:c.id,step:i+1,text:a.textEnglish});
 }
}}
console.log(JSON.stringify({recordings:catalog.length,transfers,deposits,withdrawals,rearrangements,swaps,icons:[...icons].sort((a,b)=>a-b),samples},null,2));
assert(transfers>0,'No explicit vase transfers');
