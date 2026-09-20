import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./replay-browser.js',import.meta.url),'utf8');
const c=vm.createContext({isChinese:false,assetMode:'wiki'});
vm.runInContext(source.slice(source.indexOf('  function countsAsAllSwords('),source.indexOf('  function card(')),c);
const owner={talents:[{id:189},{id:192}],enlightenedCards:[1000001,213]};
for(const id of [213,10213,20213]) assert.equal(c.countsAsAllSwords(id,{}),true,'Swift Shadow works with either source, no talent gating');
for(const id of [1000001,1010001,1020001]) assert.equal(c.countsAsAllSwords(id,owner),true,'Native rarity/base-id calculation');
for(const id of [0,-1,1000002,1000213]) assert.equal(c.countsAsAllSwords(id,owner),false);
assert.equal(c.countsAsAllSwords(1000001,{...owner,talents:[{id:189}]}),false,'P4 required');
assert.equal(c.countsAsAllSwords(1000001,{talents:[{id:192}]}),false,'Do not infer enlightenment from card name or sect');
assert.equal(c.countsAsAllSwords(1000001,{talents:[{id:192}],enlightenedCards:[1000002]}),false,'Do not reuse another owner list');
assert(c.swordMarker(213,{}).includes('all-sword.webp'));
assert.equal(c.swordMarker(1000001,{talents:[{id:189}]}),'');
// Historical red cards must use the previous snapshot; current cards use current state.
const calls=[];c.transitionCard=(entry,owner)=>{calls.push([entry.id,owner]);return ''};
vm.runInContext(source.slice(source.indexOf('  function transitionDeck('),source.indexOf('  function offerHistory(')),c);
const previous={talents:[{id:189}],enlightenedCards:[1000001]};
c.transitionDeck({deck:[{id:1000001,change:'appear'},{id:1000002,change:'leaving'}],deckPrevious:{id:213,change:'leaving'}},owner,previous);
assert.equal(calls[0][1],owner);assert.equal(calls[1][1],previous);assert.equal(calls[2][1],previous);
console.log('All-sword qualification, level variants, owner isolation and historical context passed');
Object.assign(c,{recording:{catalog:{cards:{20213:{id:20213,nameEnglish:'Swift Shadow Sword Formation',upgrade:3}}}},localizedInfo:i=>i.nameEnglish,copy:{emptySlot:'Empty'},esc:String,cardAsset:id=>`card-${id}.webp`});
vm.runInContext(source.slice(source.indexOf('  function card('),source.indexOf('  // Compare adjacent recording states')),c);
for(const characterId of [1000004,2000001,3000006]) {
 const markup=c.card(20213,false,{characterId,talents:[]});
 assert(markup.includes('all-sword-marker'),'Copied sword in any character hand gets the native marker');
}
console.log('Copied Swift Shadow card renders its marker for other characters without Li Chengyun talents');
