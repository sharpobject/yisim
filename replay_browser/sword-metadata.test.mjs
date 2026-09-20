import assert from 'node:assert/strict';
import {decodeMessage} from '../scripts/decode_live_observation.mjs';
// Native BattlePlayerData.talentDatas = field 22; lastRoundData field 12.
const varint=n=>{const b=[];while(n>=128){b.push((n%128)|128);n=Math.floor(n/128)}b.push(n);return Buffer.from(b)};
const int=(k,v)=>Buffer.concat([varint(k*8),varint(v)]);
const msg=(k,v)=>Buffer.concat([varint(k*8+2),varint(v.length),v]);
const entry=list=>Buffer.concat([int(1,189),msg(2,msg(1,Buffer.concat(list.map(varint))))]);
const publicData=Buffer.concat([msg(22,entry([1000001,1000002])),msg(200,msg(12,entry([1000001])))]);
const result=decodeMessage('PlayerData',msg(1,publicData)).public;
assert.deepEqual(result.enlightenedCards,[1000001,1000002]);
assert.deepEqual(result.lastRound.enlightenedCards,[1000001]);
assert.deepEqual(decodeMessage('PlayerData',msg(1,Buffer.alloc(0))).public.enlightenedCards,[]);
console.log('Native public and prior-round enlightened-card protocol fields remain distinct');
