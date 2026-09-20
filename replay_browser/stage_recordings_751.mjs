#!/usr/bin/env node
// Build the authorized collection in a PRIVATE staging directory. Copy its
// artifacts to the public wiki only as a separate publication operation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import codec from './recording-codec.cjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const [manifestPath,wikiArgument,outputArgument]=process.argv.slice(2);
if(!manifestPath||!wikiArgument||!outputArgument)throw Error('usage: stage_recordings_751.mjs PRIVATE_MANIFEST.json TEMPLATE_WIKI PRIVATE_OUTPUT');
const wiki=path.resolve(wikiArgument),output=path.resolve(outputArgument);
assert(output!==wiki&&!output.startsWith(wiki+'/'),'Build privately before publishing');
const matches=JSON.parse(fs.readFileSync(manifestPath,'utf8')).matches;
assert(Array.isArray(matches)&&matches.length);
const cache=path.join(here,'.recording-payload-cache'),replays=path.resolve(here,'../scrape/data/replays');
const dataRoot=path.join(output,'assets/recordings_751/data');
const catalog=[],payloads=new Map(),games=new Set(),shared=Object.fromEntries(codec.CATALOG_KINDS.map(k=>[k,{}]));
function patch(s,d){if(!d||typeof d!=='object'||Array.isArray(d))return structuredClone(d);s=s&&typeof s==='object'&&!Array.isArray(s)?s:{};for(const[k,v]of Object.entries(d)){if(v?.$deleted)delete s[k];else s[k]=patch(s[k],v)}return s}
function cupData(code){const dir=path.join(replays,String(Math.floor(code/1000)*1000));if(!fs.existsSync(dir))return null;for(const f of fs.readdirSync(dir).filter(f=>f.startsWith(`${code}_p`)&&f.endsWith('.json'))){try{const r=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));const c=r.data?.cupData??r.cupData;if(c)return c}catch{}}return null}
for(const c of matches){
 assert.equal(c.targetCharacterId,3000006);assert.equal(c.career,6);
 assert(c.firstRound===1||(c.gameMode===6&&c.firstRound<=3));
 const key=`${c.codeId}:${c.targetUid}`;assert(!games.has(key));games.add(key);
 const id='r-'+createHash('sha256').update(`${c.targetUid}\0${c.capturedThrough}`).digest('hex').slice(0,16);
 const payload=JSON.parse(fs.readFileSync(path.join(cache,`${id}.compact.json`),'utf8'),(k,v)=>['codeId','roomId'].includes(k)?undefined:v);
 assert.equal(payload.targetUid,c.targetUid);assert.equal(payload.id,id);
 assert(!JSON.stringify(payload).includes('.jsonl'),'Capture paths must not be public');
 let s={},career=0;const selected=new Set(),offered=new Set(),opponents=new Map(),rounds=new Set();
 for(const step of payload.steps){
  s=patch(s,step.patch??{});rounds.add(Number(s.round));
  const priv=s.privatePlayer;if(!priv)continue;
  if(priv.uid!==c.targetUid){const target=s.players?.[c.targetUid];assert(target&&(target.life<=0||target.settled),"Unexpected perspective switch before elimination");continue;}
  const own=s.players?.[priv.uid];if(own?.characterId)assert.equal(own.characterId,3000006);
  if(!career)career=parseInt(own?.career)||0;
  for(const f of priv.selectedFateStrategies??[]){if(Number(f.id)>0)selected.add(Number(f.id));for(const group of f.choiceHistory?.offers??[])for(const id of group)if(Number(id)>0)offered.add(Number(id))}
  if(priv.choiceOverlay?.kind==='heavenly-derivation')for(const f of priv.choiceOverlay.options??[])if(Number(f.id)>0)offered.add(Number(f.id));
  for(const p of Object.values(s.players??{}))if(p.uid!==c.targetUid&&!p.ai&&p.characterId>0)opponents.set(p.characterId,payload.catalog.characters[p.characterId]);
 }
 assert.equal(career,6);assert(rounds.has(1),'Missing reconstructed opening');assert(rounds.has(c.rounds));
 const fate=id=>{const f=payload.catalog.fateStrategies[id];assert(f);return{id,nameEnglish:f.nameEnglish,nameChinese:f.nameChinese}};
 const cup=c.gameMode===6?cupData(c.codeId):null,progress=Number(cup?.progress)||0;
 catalog.push({id,file:`${id}.compact.json.gz`,targetUid:c.targetUid,targetUsername:c.targetUsername,targetCharacterId:c.targetCharacterId,gameMode:c.gameMode,firstRound:c.firstRound,cupId:Number(cup?.cupId)||0,cupProgress:progress,cupStage:progress>3?'final':progress>0?'preliminary':'',practice:c.gameMode===2&&c.capturedThrough>='2026-09-08T00:00:00.000Z'&&c.capturedThrough<'2026-09-19T00:00:00.000Z',startingRating:c.startingRating,career,rounds:c.rounds,capturedThrough:c.capturedThrough,
 // Legacy codec field names refer to the observed player in this collection.
 linCareer:career,linFates:[...selected].sort((a,b)=>a-b).map(fate),linUnchosenFates:[...offered].filter(id=>!selected.has(id)).sort((a,b)=>a-b).map(fate),humanOpponentCharacters:[...opponents].sort(([a],[b])=>a-b).map(([id,f])=>{assert(f);return{id,nameEnglish:f.nameEnglish,nameChinese:f.nameChinese}}),label:`${c.targetUsername} · ${c.rounds} rounds`});
 payloads.set(id,payload);
 for(const kind of codec.CATALOG_KINDS)for(const[id,f]of Object.entries(payload.catalog[kind]??{}))shared[kind][id]??=f;
}
catalog.sort((a,b)=>a.targetUid.localeCompare(b.targetUid)||b.capturedThrough.localeCompare(a.capturedThrough));
fs.mkdirSync(dataRoot,{recursive:true});let bytes=0;const contentHash=createHash("sha256");
for(const c of catalog){
 const payload=payloads.get(c.id);let best;
 for(const stringLimit of [0,16,64,256,Infinity]){const packed=codec.packRecording(payload,{stringLimit,sharedCatalog:shared});const data=gzipSync(JSON.stringify(packed),{level:9});if(!best||data.length<best.length)best=data}
 assert.deepEqual(codec.unpackRecording(JSON.parse(gunzipSync(best)),shared),payload,`Round-trip ${c.id}`);
 fs.writeFileSync(path.join(dataRoot,c.file),best);bytes+=best.length;contentHash.update(best);
}
const packed=codec.packCatalog(shared,catalog);assert.deepEqual(codec.unpackCatalog(packed),{sharedCatalog:shared,catalog});
fs.writeFileSync(path.join(dataRoot,'catalog.compact.json.gz'),gzipSync(JSON.stringify(packed),{level:9}));
assert.deepEqual(new Set(fs.readdirSync(dataRoot)),new Set(['catalog.compact.json.gz',...catalog.map(c=>c.file)]));
const version='751-'+contentHash.update(JSON.stringify(packed)).digest('hex').slice(0,12);
const zhName=shared.characters[3000006].nameChinese;
for(const lang of ['en','zh']){
 const english=lang==='en';let html=fs.readFileSync(path.join(wiki,lang,'recordings/index.html'),'utf8');
 html=html.replace('data-recording-base="/yxp_wiki/assets/recordings/data"','data-recording-base="/yxp_wiki/assets/recordings_751/data"').replace(/data-recording-version="[^"]*"/,`data-recording-version="${version}"`);
 html=html.replaceAll('/en/recordings/','/en/recordings_751/').replaceAll('/zh/recordings/','/zh/recordings_751/');
 html=html.replace(/<title>.*?<\/title>/,`<title>${english?'Qi Wangyou · Plant Master recordings':`${zhName}·灵植师对局录像`} - ${english?'Yi Xian Card Gallery':'弈仙牌卡牌图鉴'}</title>`);
 html=html.replace(/<h1>.*?<\/h1>/,`<h1>${english?'Qi Wangyou · Plant Master':`${zhName} · 灵植师`}</h1>`);
 html=html.replace(english?'Browse a recorded player’s actions and the prior-round information available about the rest of the lobby.':'浏览已记录玩家的操作，以及大厅中其他玩家上一轮的公开信息。',english?'Recorded Plant Master Qi Wangyou games, including ranked, private-room and Heavenly Derivation Cup matches.':`灵植师${zhName}的对局录像，包含排位、私人房间和天衍杯。`);
 assert(html.includes('assets/recordings_751/data'));assert(html.includes(`/${english?'zh':'en'}/recordings_751/`));
 const out=path.join(output,lang,'recordings_751');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);
}
console.log(JSON.stringify({recordings:catalog.length,accounts:new Set(catalog.map(c=>c.targetUid)).size,compressedBytes:bytes,cupPreliminary:catalog.filter(c=>c.cupStage==='preliminary').length,cupFinal:catalog.filter(c=>c.cupStage==='final').length,cupUnknown:catalog.filter(c=>c.gameMode===6&&!c.cupStage).length,lateCup:catalog.filter(c=>c.firstRound>1).length,privateRoom:catalog.filter(c=>c.gameMode===2).length,ranked:catalog.filter(c=>c.gameMode===3).length,version},null,2));
