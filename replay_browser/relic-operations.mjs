import {decodeFields} from '../proxy/protocol.mjs';
export function packedInts(hex) {
  const result=[];let value=0,shift=0;
  for(const b of Buffer.from(hex??'','hex')){value+=(b&127)*2**shift;if(b&128)shift+=7;else{result.push(value);value=0;shift=0;}}
  return result;
}
export function relicStorage(player) {
  if(player?.relicStorage)return player.relicStorage;
  const hex=player?.unknownLengthDelimitedFields?.find(f=>f.field===9)?.hex;
  if(!hex)return {};
  const fields=decodeFields(Buffer.from(hex,'hex'));
  const packed=n=>fields.filter(f=>f.number===n).flatMap(f=>Buffer.isBuffer(f.value)?packedInts(f.value.toString('hex')):[Number(f.value)]);
  const cards=n=>fields.filter(f=>f.number===n).map(f=>Number(decodeFields(f.value).find(x=>x.number===1)?.value??0));
  return {2:packed(3),3:cards(5),4:cards(7),5:packed(9)};
}
export function relicAction(details) {
  return {operation:Number(details?.fields?.find(f=>f.field===1)?.integer??0),params:packedInts(details?.fields?.find(f=>f.field===2)?.hex)};
}
export function applyRelicTransfer(player,details,wrap=id=>id) {
  const {operation,params:[from,fromIndex,to,toIndex]}=relicAction(details);
  if(!player||![2,5].includes(operation))return false;
  player.relicStorage??=Object.fromEntries(Object.entries(relicStorage(player)).map(([k,ids])=>[k,ids.map(wrap)]));
  const list=p=>p===0?player.hand:p===1?player.deck:player.relicStorage[p];
  const source=list(from),dest=list(to);if(!source||!dest||fromIndex<0||fromIndex>=source.length)return false;
  const card=source[fromIndex];const id=x=>typeof x==='object'?x?.id:x;
  if(from===0&&[2,3,4,5].includes(to)){
    if(toIndex<0||toIndex>=dest.length)return false;
    const displaced=dest[toIndex];source.splice(fromIndex,1);dest[toIndex]=card;
    if(id(displaced))player.hand.push(displaced);return true;
  }
  if([2,5].includes(from)&&to===0){source[fromIndex]=wrap(0);player.hand.push(card);return true;}
  if(from===to&&[2,5].includes(from)&&toIndex>=0&&toIndex<dest.length){[source[fromIndex],dest[toIndex]]=[dest[toIndex],card];return true;}
  return false;
}
export function relicCultivation(player,details){
 const {operation,params:[from,,to,toIndex]}=relicAction(details);if(operation!==2)return 0;
 const v=relicStorage(player)[to]?.[toIndex],id=typeof v==='object'?v?.id:v;
 return from===0&&[2,5].includes(to)?(id?0:1):[2,5].includes(from)&&to===0?-1:0;
}
